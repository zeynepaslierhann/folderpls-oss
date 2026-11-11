/**
 * Yerel depo: etiket verisi tarayıcıda, IndexedDB'de. Kayıtlar `snapshot.ts`
 * biçiminde tutulur (tarihler ISO metni), `Date`'e yalnız okurken çevrilir.
 * Birden çok deposu olan her işlem tek transaction'dır: etiket silme, öğelerden
 * çıkarma ve tombstone birlikte yazılır ya da hiç yazılmaz.
 */
import { isValidLabelColor } from "@/lib/constants/colors";
import { isCollectionNameTooLong, isFilterGroupTooLarge } from "@/lib/collections/limits";
import { isValidItemId, normalizeNotes, normalizeRelations } from "@/lib/tagged-items/validation";
import type { Label, LabelItem, PropertyDefinition, SmartCollection, TaggedItem } from "@/lib/types";
import {
  notFoundError,
  type ItemContentPatch,
  type ItemPropertyValue,
  type LabelDefinitions,
  type LabelStoreChangeOrigin,
  type LabelStoreListener,
  type SaveCollectionInput,
  type SyncableLabelStore,
  type TagItemInput,
} from "./label-store";
import { hasMergeChanges, mergeSnapshots, type MergeStats } from "./merge";
import {
  buildSnapshot,
  isPropertyValueTooLarge,
  toIsoDate,
  type SnapshotCollection,
  type SnapshotData,
  type SnapshotItem,
  type SnapshotLabel,
  type SnapshotPropertyDefinition,
  type SnapshotTombstone,
  type TagsSnapshot,
  type TombstoneKind,
} from "./snapshot";

const DB_VERSION = 1;
const STORES = ["labels", "items", "propertyDefinitions", "collections", "tombstones"] as const;
type StoreName = (typeof STORES)[number];

const connections = new Map<string, Promise<IDBDatabase>>();

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Veritabanını siler. Açık bağlantı kapatılmazsa silme sonsuza dek bekler. */
export async function deleteLocalDatabase(name: string): Promise<void> {
  const cached = connections.get(name);
  connections.delete(name);
  if (cached) (await cached.catch(() => null))?.close();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function openDatabase(name: string): Promise<IDBDatabase> {
  const cached = connections.get(name);
  if (cached) return cached;
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(name, DB_VERSION);
    req.onupgradeneeded = () => {
      const database = req.result;
      database.createObjectStore("labels", { keyPath: "id" });
      database.createObjectStore("items", { keyPath: "itemId" });
      database.createObjectStore("propertyDefinitions", { keyPath: "id" });
      database.createObjectStore("collections", { keyPath: "id" });
      database.createObjectStore("tombstones", { keyPath: ["kind", "id"] });
    };
    req.onsuccess = () => {
      const database = req.result;
      database.onversionchange = () => {
        database.close();
        connections.delete(name);
      };
      resolve(database);
    };
    req.onerror = () => reject(req.error);
  });
  opening.catch(() => connections.delete(name));
  connections.set(name, opening);
  return opening;
}

let lastStamp = 0;

/**
 * Verilen damgaların hepsinden kesin sonra gelen damga. Başka cihazın saati
 * ileride olsa bile bu cihazda sonradan yapılan değişiklik birleştirmede
 * kaybolmaz; aynı milisaniyedeki kayıtlar da oluşturma sırasını korur.
 * Yeniden oluşturmada kaydın eski tombstone'u da verilir: birleştirme
 * `deletedAt >= updatedAt` iken silmeyi seçtiği için yeni kayıt ondan sonra gelmeli.
 */
function nextStamp(...previous: (string | undefined)[]): string {
  let floor = 0;
  for (const stamp of previous) {
    const time = stamp ? Date.parse(stamp) : NaN;
    if (!Number.isNaN(time)) floor = Math.max(floor, time + 1);
  }
  lastStamp = Math.max(Date.now(), floor, lastStamp + 1);
  return new Date(lastStamp).toISOString();
}

function dateOf(iso: string): Date {
  return new Date(iso);
}

function hydrateItem(record: SnapshotItem): TaggedItem {
  return {
    ...record,
    notes: record.notes.map((note) => ({ ...note, createdAt: dateOf(note.createdAt) })),
    relations: record.relations.map((relation) => ({ ...relation, createdAt: dateOf(relation.createdAt) })),
    addedAt: dateOf(record.addedAt),
    updatedAt: dateOf(record.updatedAt),
  };
}

function hydrateDefinition(record: SnapshotPropertyDefinition): PropertyDefinition {
  return {
    ...record,
    options: record.options?.map(({ createdAt, ...option }) => ({
      ...option,
      ...(createdAt ? { createdAt: dateOf(createdAt) } : {}),
    })),
    createdAt: dateOf(record.createdAt),
    updatedAt: dateOf(record.updatedAt),
  };
}

function hydrateCollection(record: SnapshotCollection): SmartCollection {
  return { ...record, createdAt: dateOf(record.createdAt), updatedAt: dateOf(record.updatedAt) };
}

function byCreatedAt<T extends { createdAt: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

function emptyItem(itemId: string, stamp: string): SnapshotItem {
  return { itemId, name: "", type: "file", labels: [], properties: {}, notes: [], relations: [], addedAt: stamp, updatedAt: stamp };
}

/** Çağıranın `...previousMeta` ile verdiği tarihleri kayıt biçimine çevirir. */
function serializeContent(item: Partial<TaggedItem>, stamp: string): Partial<SnapshotItem> {
  const out: Record<string, unknown> = { ...item };
  delete out.addedAt;
  delete out.updatedAt;
  if (item.notes) out.notes = item.notes.map((note) => ({ ...note, createdAt: toIsoDate(note.createdAt) ?? stamp }));
  if (item.relations) {
    out.relations = item.relations.map((relation) => ({ ...relation, createdAt: toIsoDate(relation.createdAt) ?? stamp }));
  }
  return out as Partial<SnapshotItem>;
}

function assertValidColor(color: string): void {
  if (!isValidLabelColor(color)) throw new Error(`Invalid label color: ${color}`);
}

export class IndexedDbLabelStore implements SyncableLabelStore {
  private readonly databaseName: string;
  private readonly listeners = new Set<LabelStoreListener>();

  constructor(databaseName: string) {
    this.databaseName = databaseName;
  }

  subscribe(listener: LabelStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitChange(origin: LabelStoreChangeOrigin): void {
    this.listeners.forEach((listener) => listener(origin));
  }

  private async transaction<T>(
    names: readonly StoreName[],
    mode: IDBTransactionMode,
    run: (tx: IDBTransaction) => Promise<T>,
    { silent = false }: { silent?: boolean } = {}
  ): Promise<T> {
    const database = await openDatabase(this.databaseName);
    const tx = database.transaction(names, mode);
    const finished = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
    try {
      const result = await run(tx);
      await finished;
      if (mode === "readwrite" && !silent) this.emitChange("local");
      return result;
    } catch (err) {
      finished.catch(() => undefined);
      try {
        tx.abort();
      } catch {
        // İşlem zaten bitmiş.
      }
      throw err;
    }
  }

  private readAll(tx: IDBTransaction): Promise<SnapshotData> {
    return Promise.all([
      request<SnapshotLabel[]>(tx.objectStore("labels").getAll()),
      request<SnapshotItem[]>(tx.objectStore("items").getAll()),
      request<SnapshotPropertyDefinition[]>(tx.objectStore("propertyDefinitions").getAll()),
      request<SnapshotCollection[]>(tx.objectStore("collections").getAll()),
      request<SnapshotTombstone[]>(tx.objectStore("tombstones").getAll()),
    ]).then(([labels, items, propertyDefinitions, collections, tombstones]) => ({
      labels,
      items,
      propertyDefinitions,
      collections,
      tombstones,
    }));
  }

  private writeTombstone(tx: IDBTransaction, kind: TombstoneKind, id: string, deletedAt: string): void {
    tx.objectStore("tombstones").put({ kind, id, deletedAt } satisfies SnapshotTombstone);
  }

  private clearTombstone(tx: IDBTransaction, kind: TombstoneKind, id: string): void {
    tx.objectStore("tombstones").delete([kind, id]);
  }

  /** Kayıt silinmişse silinme anı; yeniden oluşturmanın damgası bundan büyük olmalı. */
  private async deletedAtOf(tx: IDBTransaction, kind: TombstoneKind, id: string): Promise<string | undefined> {
    const tombstone = await request<SnapshotTombstone | undefined>(tx.objectStore("tombstones").get([kind, id]));
    return tombstone?.deletedAt;
  }

  async loadDefinitions(): Promise<LabelDefinitions> {
    return this.transaction(["labels", "propertyDefinitions"], "readonly", async (tx) => {
      const [labels, definitions] = await Promise.all([
        request<SnapshotLabel[]>(tx.objectStore("labels").getAll()),
        request<SnapshotPropertyDefinition[]>(tx.objectStore("propertyDefinitions").getAll()),
      ]);
      return {
        labels: byCreatedAt(labels).map(({ id, name, color }) => ({ id, name, color })),
        propertyDefinitions: byCreatedAt(definitions).map(hydrateDefinition),
      };
    });
  }

  async createLabel(label: Omit<Label, "createdAt">): Promise<void> {
    assertValidColor(label.color);
    await this.transaction(["labels", "tombstones"], "readwrite", async (tx) => {
      const labels = tx.objectStore("labels");
      const existing = await request<SnapshotLabel | undefined>(labels.get(label.id));
      const stamp = nextStamp(existing?.updatedAt, await this.deletedAtOf(tx, "label", label.id));
      labels.put({
        id: label.id,
        name: label.name,
        color: label.color,
        createdAt: stamp,
        updatedAt: stamp,
      } satisfies SnapshotLabel);
      this.clearTombstone(tx, "label", label.id);
    });
  }

  async updateLabels(updated: LabelItem[], deletedIds: string[]): Promise<void> {
    updated.forEach((label) => assertValidColor(label.color));
    await this.transaction(["labels", "items", "tombstones"], "readwrite", async (tx) => {
      const labels = tx.objectStore("labels");
      for (const label of updated) {
        const existing = await request<SnapshotLabel | undefined>(labels.get(label.id));
        const stamp = nextStamp(existing?.updatedAt, await this.deletedAtOf(tx, "label", label.id));
        labels.put({
          id: label.id,
          name: label.name,
          color: label.color,
          createdAt: existing?.createdAt ?? stamp,
          updatedAt: stamp,
        } satisfies SnapshotLabel);
        this.clearTombstone(tx, "label", label.id);
      }
      if (deletedIds.length === 0) return;

      const deleted = new Set(deletedIds);
      for (const id of deletedIds) {
        const existing = await request<SnapshotLabel | undefined>(labels.get(id));
        labels.delete(id);
        this.writeTombstone(tx, "label", id, nextStamp(existing?.updatedAt));
      }
      const items = tx.objectStore("items");
      const all = await request<SnapshotItem[]>(items.getAll());
      for (const item of all) {
        if (!item.labels.some((id) => deleted.has(id))) continue;
        const next: SnapshotItem = {
          ...item,
          labels: item.labels.filter((id) => !deleted.has(id)),
          updatedAt: nextStamp(item.updatedAt),
        };
        if (item.labelExpiries) {
          const expiries = Object.entries(item.labelExpiries).filter(([id]) => !deleted.has(id));
          if (expiries.length > 0) next.labelExpiries = Object.fromEntries(expiries);
          else delete next.labelExpiries;
        }
        items.put(next);
      }
    });
  }

  async savePropertyDefinition(definition: PropertyDefinition): Promise<void> {
    await this.transaction(["propertyDefinitions", "tombstones"], "readwrite", async (tx) => {
      const store = tx.objectStore("propertyDefinitions");
      const existing = await request<SnapshotPropertyDefinition | undefined>(store.get(definition.id));
      const stamp = nextStamp(existing?.updatedAt, await this.deletedAtOf(tx, "propertyDefinition", definition.id));
      store.put({
        ...definition,
        options: definition.options?.map(({ createdAt, ...option }) => ({
          ...option,
          ...(createdAt ? { createdAt: toIsoDate(createdAt) ?? stamp } : {}),
        })),
        createdAt: existing?.createdAt ?? toIsoDate(definition.createdAt) ?? stamp,
        updatedAt: stamp,
      } satisfies SnapshotPropertyDefinition);
      this.clearTombstone(tx, "propertyDefinition", definition.id);
    });
  }

  private async deleteRecord(store: StoreName, kind: TombstoneKind, id: string): Promise<void> {
    await this.transaction([store, "tombstones"], "readwrite", async (tx) => {
      const objectStore = tx.objectStore(store);
      const existing = await request<{ updatedAt: string } | undefined>(objectStore.get(id));
      objectStore.delete(id);
      this.writeTombstone(tx, kind, id, nextStamp(existing?.updatedAt));
    });
  }

  deletePropertyDefinition(id: string): Promise<void> {
    return this.deleteRecord("propertyDefinitions", "propertyDefinition", id);
  }

  async listTaggedItems(): Promise<Record<string, TaggedItem>> {
    return this.transaction(["items"], "readonly", async (tx) => {
      const all = await request<SnapshotItem[]>(tx.objectStore("items").getAll());
      return Object.fromEntries(all.map((record) => [record.itemId, hydrateItem(record)]));
    });
  }

  async getItemsByLabel(labelId: string): Promise<TaggedItem[]> {
    const items = await this.listTaggedItems();
    return Object.values(items).filter((item) => item.labels.includes(labelId));
  }

  /** Öğeyi tek transaction içinde okuyup yazar; öğe yoksa `update` `undefined` alır. */
  private async mutateItem(
    itemId: string,
    update: (existing: SnapshotItem | undefined, stamp: string) => SnapshotItem
  ): Promise<void> {
    if (!isValidItemId(itemId)) throw new Error("Invalid item id");
    await this.transaction(["items", "tombstones"], "readwrite", async (tx) => {
      const items = tx.objectStore("items");
      const existing = await request<SnapshotItem | undefined>(items.get(itemId));
      items.put(update(existing, nextStamp(existing?.updatedAt, await this.deletedAtOf(tx, "item", itemId))));
      this.clearTombstone(tx, "item", itemId);
    });
  }

  tagItem(item: TagItemInput): Promise<void> {
    return this.mutateItem(item.itemId, (existing, stamp) => {
      const fields = serializeContent(item, stamp);
      if (!existing) {
        const created = { ...emptyItem(item.itemId, stamp), ...fields, properties: {}, notes: [], relations: [] };
        for (const key of Object.keys(created) as (keyof SnapshotItem)[]) {
          if (created[key] === undefined) delete created[key];
        }
        return created;
      }
      const next = { ...existing, ...fields, updatedAt: stamp };
      for (const key of Object.keys(next) as (keyof SnapshotItem)[]) {
        if (next[key] === undefined) delete next[key];
      }
      return next;
    });
  }

  updateItemProperty(itemId: string, propertyId: string, value: ItemPropertyValue): Promise<void> {
    if (isPropertyValueTooLarge(value)) return Promise.reject(new Error("Property value too large"));
    return this.mutateItem(itemId, (existing, stamp) => {
      const base = existing ?? emptyItem(itemId, stamp);
      return { ...base, properties: { ...base.properties, [propertyId]: value }, updatedAt: stamp };
    });
  }

  updateItemLabels(itemId: string, labels: string[]): Promise<void> {
    return this.mutateItem(itemId, (existing, stamp) => {
      if (!existing) throw notFoundError("No document to update");
      return { ...existing, labels, updatedAt: stamp };
    });
  }

  addLabelToItem(itemId: string, labelId: string): Promise<void> {
    return this.mutateItem(itemId, (existing, stamp) => {
      const base = existing ?? { ...emptyItem(itemId, stamp), name: "Unknown File" };
      return { ...base, labels: [...new Set([...base.labels, labelId])], updatedAt: stamp };
    });
  }

  removeLabelFromItem(itemId: string, labelId: string): Promise<void> {
    return this.mutateItem(itemId, (existing, stamp) => {
      if (!existing) throw notFoundError("No document to update");
      return { ...existing, labels: existing.labels.filter((id) => id !== labelId), updatedAt: stamp };
    });
  }

  updateItemContent(itemId: string, patch: ItemContentPatch): Promise<void> {
    const notes = patch.notes ? normalizeNotes(patch.notes as unknown as unknown[]) : undefined;
    const relations = patch.relations ? normalizeRelations(patch.relations as unknown as unknown[]) : undefined;
    if (notes && !notes.ok) return Promise.reject(new Error(notes.error));
    if (relations && !relations.ok) return Promise.reject(new Error(relations.error));

    return this.mutateItem(itemId, (existing, stamp) => ({
      ...(existing ?? emptyItem(itemId, stamp)),
      ...serializeContent(
        {
          ...(notes ? { notes: notes.value as unknown as TaggedItem["notes"] } : {}),
          ...(relations ? { relations: relations.value as unknown as NonNullable<TaggedItem["relations"]> } : {}),
        },
        stamp
      ),
      updatedAt: stamp,
    }));
  }

  deleteItem(itemId: string): Promise<void> {
    return this.deleteRecord("items", "item", itemId);
  }

  async listCollections(): Promise<SmartCollection[]> {
    return this.transaction(["collections"], "readonly", async (tx) => {
      const all = await request<SnapshotCollection[]>(tx.objectStore("collections").getAll());
      return byCreatedAt(all).map(hydrateCollection);
    });
  }

  /** Plan sınırı yok; yalnız girdi doğrulaması (ad, filtre boyutu) sunucu kurallarıyla aynı. */
  async saveCollection(input: SaveCollectionInput): Promise<SmartCollection> {
    const name = input.name.trim();
    if (!name || isCollectionNameTooLong(name) || isFilterGroupTooLarge(input.filterGroup)) {
      throw new Error("Failed to save collection");
    }
    return this.transaction(["collections", "tombstones"], "readwrite", async (tx) => {
      const store = tx.objectStore("collections");
      const existing = input.id ? await request<SnapshotCollection | undefined>(store.get(input.id)) : undefined;
      if (input.id && !existing) throw new Error("Failed to save collection");

      const id = input.id ?? `col_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const stamp = nextStamp(existing?.updatedAt, await this.deletedAtOf(tx, "collection", id));
      const record: SnapshotCollection = {
        ...existing,
        id,
        name,
        filterGroup: input.filterGroup,
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        createdAt: existing?.createdAt ?? stamp,
        updatedAt: stamp,
      };
      store.put(record);
      this.clearTombstone(tx, "collection", id);
      return hydrateCollection(record);
    });
  }

  deleteCollection(id: string): Promise<void> {
    return this.deleteRecord("collections", "collection", id);
  }

  async exportSnapshot(): Promise<TagsSnapshot> {
    return this.transaction(STORES, "readonly", async (tx) => buildSnapshot(await this.readAll(tx)));
  }

  async importSnapshot(
    snapshot: TagsSnapshot,
    { origin = "local" }: { origin?: LabelStoreChangeOrigin } = {}
  ): Promise<MergeStats> {
    const stats = await this.transaction(STORES, "readwrite", (tx) => this.mergeInto(tx, snapshot), { silent: true });
    if (hasMergeChanges(stats)) this.emitChange(origin);
    return stats;
  }

  /** Değişiklik yoksa yazmaz: otomatik yedek her turda buradan geçer. */
  private async mergeInto(tx: IDBTransaction, snapshot: TagsSnapshot): Promise<MergeStats> {
    const local = buildSnapshot(await this.readAll(tx));
    const { snapshot: merged, stats } = mergeSnapshots(local, snapshot);
    if (!hasMergeChanges(stats)) return stats;
    for (const name of STORES) tx.objectStore(name).clear();
    for (const label of merged.labels) tx.objectStore("labels").put(label);
    for (const item of merged.items) tx.objectStore("items").put(item);
    for (const definition of merged.propertyDefinitions) tx.objectStore("propertyDefinitions").put(definition);
    for (const collection of merged.collections) tx.objectStore("collections").put(collection);
    for (const tombstone of merged.tombstones) tx.objectStore("tombstones").put(tombstone);
    return stats;
  }
}
