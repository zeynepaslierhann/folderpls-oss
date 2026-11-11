/**
 * Hesap başına etiket deposu. Her Google hesabının etiketleri bu tarayıcıda ayrı
 * bir IndexedDB veritabanında durur; bir hesabın verisi başka hesabın deposuna ya
 * da Drive yedeğine hiç yazılmaz.
 *
 * Depo anahtarı Drive `about.user.permissionId` değerinin özetidir: e-posta
 * değişse de aynı kalır, veritabanı adında kimlik ya da e-posta açık yazılmaz.
 *
 * Drive bağlı değilken son bağlanan hesabın deposu açık kalır (bağlantı kesmek
 * etiketleri gizlemez). Hiç hesap bağlanmamışsa eski tek depo (`folderpls-tags`)
 * açıktır; o depo ilk sahibine bir kez taşınır (`migrateLegacy`).
 */
import {
  ACTIVE_LABEL_STORE_STORAGE_KEY,
  DRIVE_BACKUP_STATE_STORAGE_KEY,
  LEGACY_STORE_MIGRATION_STORAGE_KEY,
} from "@/lib/constants";
import { deleteLocalDatabase, IndexedDbLabelStore } from "./indexeddb-label-store";
import type {
  ItemContentPatch,
  ItemPropertyValue,
  LabelDefinitions,
  LabelStoreChangeOrigin,
  LabelStoreListener,
  SaveCollectionInput,
  SyncableLabelStore,
  TagItemInput,
} from "./label-store";
import type { MergeStats } from "./merge";
import type { TagsSnapshot } from "./snapshot";
import type { Label, LabelItem, PropertyDefinition, SmartCollection, TaggedItem } from "@/lib/types";

/** Hesaplara ayrılmadan önceki tek depo; hiç hesap bağlanmamışken de bu açıktır. */
export const LEGACY_DATABASE_NAME = "folderpls-tags";
const ACCOUNT_DATABASE_PREFIX = "folderpls-tags:account:";
const STORE_KEY_PATTERN = /^[0-9a-f]{32}$/;
const MIGRATION_LOCK = "folderpls-store-migration";

export function isStoreKey(value: unknown): value is string {
  return typeof value === "string" && STORE_KEY_PATTERN.test(value);
}

async function digest(text: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

/** Drive `permissionId` hesaba kalıcı bağlıdır; özeti depo, yedek durumu ve yedek işareti için kullanılır. */
export function accountStoreKey(permissionId: string): Promise<string> {
  return digest(`folderpls-store:v1:${permissionId}`);
}

/** Eski deponun sahibini e-postayı saklamadan tanımak için. */
export function ownerHintFor(email: string): Promise<string> {
  return digest(`folderpls-owner:v1:${email.trim().toLowerCase()}`);
}

export function databaseNameFor(storeKey: string | null): string {
  return storeKey ? `${ACCOUNT_DATABASE_PREFIX}${storeKey}` : LEGACY_DATABASE_NAME;
}

/** Otomatik yedeğin bekleyen değişiklik sayacı da hesap başınadır. */
export function backupStateKeyFor(storeKey: string | null): string {
  return storeKey ? `${DRIVE_BACKUP_STATE_STORAGE_KEY}:${storeKey}` : DRIVE_BACKUP_STATE_STORAGE_KEY;
}

// --- localStorage (yoksa ya da kapalıysa bellek) ---

const memory = new Map<string, string>();

function localStore(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function readValue(key: string): string | null {
  try {
    const storage = localStore();
    if (storage) return storage.getItem(key);
  } catch {
    // Kapalı depolama: bellekteki değer kullanılır.
  }
  return memory.get(key) ?? null;
}

function writeValue(key: string, value: string): void {
  memory.set(key, value);
  try {
    localStore()?.setItem(key, value);
  } catch {
    // Dolu ya da kapalı: bu sekme bellekteki değerle sürer.
  }
}

// --- Somut depolar ---

const stores = new Map<string | null, IndexedDbLabelStore>();

/** Belirli hesabın deposu (`null`: hesaba bağlanmamış eski depo). Yedek her zaman buradan yazar. */
export function getAccountStore(storeKey: string | null): SyncableLabelStore {
  return concreteStore(storeKey);
}

function concreteStore(storeKey: string | null): IndexedDbLabelStore {
  let store = stores.get(storeKey);
  if (!store) {
    const created = new IndexedDbLabelStore(databaseNameFor(storeKey));
    created.subscribe((origin) => {
      if (storeKey === getActiveStoreKey()) facade.forward(origin);
    });
    stores.set(storeKey, created);
    store = created;
  }
  return store;
}

// --- Açık depo ---

let activeKey: string | null | undefined;
let switching: Promise<unknown> = Promise.resolve();
const activeListeners = new Set<() => void>();

export function getActiveStoreKey(): string | null {
  if (activeKey === undefined) {
    const stored = readValue(ACTIVE_LABEL_STORE_STORAGE_KEY);
    activeKey = isStoreKey(stored) ? stored : null;
  }
  return activeKey;
}

export function subscribeActiveStore(listener: () => void): () => void {
  activeListeners.add(listener);
  return () => activeListeners.delete(listener);
}

function setActiveStoreKey(storeKey: string): boolean {
  if (getActiveStoreKey() === storeKey) return false;
  activeKey = storeKey;
  writeValue(ACTIVE_LABEL_STORE_STORAGE_KEY, storeKey);
  activeListeners.forEach((listener) => listener());
  // Ekranlar yeni hesabın verisini yeniden okusun; yedeklenecek bir değişiklik değil.
  facade.forward("sync");
  return true;
}

/**
 * Arayüzün kullandığı depo: her çağrıyı açık hesabın deposuna iletir. Hesap
 * değişirken (taşıma dahil) gelen çağrı değişimin bitmesini bekler; böylece eski
 * depoya geç yazılıp kaybolmaz.
 */
class ActiveLabelStore implements SyncableLabelStore {
  private readonly listeners = new Set<LabelStoreListener>();

  forward(origin: LabelStoreChangeOrigin): void {
    this.listeners.forEach((listener) => listener(origin));
  }

  subscribe(listener: LabelStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async target(): Promise<IndexedDbLabelStore> {
    await switching.catch(() => undefined);
    return concreteStore(getActiveStoreKey());
  }

  async loadDefinitions(): Promise<LabelDefinitions> {
    return (await this.target()).loadDefinitions();
  }
  async createLabel(label: Omit<Label, "createdAt">): Promise<void> {
    return (await this.target()).createLabel(label);
  }
  async updateLabels(updated: LabelItem[], deletedIds: string[]): Promise<void> {
    return (await this.target()).updateLabels(updated, deletedIds);
  }
  async savePropertyDefinition(definition: PropertyDefinition): Promise<void> {
    return (await this.target()).savePropertyDefinition(definition);
  }
  async deletePropertyDefinition(id: string): Promise<void> {
    return (await this.target()).deletePropertyDefinition(id);
  }
  async listTaggedItems(): Promise<Record<string, TaggedItem>> {
    return (await this.target()).listTaggedItems();
  }
  async getItemsByLabel(labelId: string): Promise<TaggedItem[]> {
    return (await this.target()).getItemsByLabel(labelId);
  }
  async tagItem(item: TagItemInput): Promise<void> {
    return (await this.target()).tagItem(item);
  }
  async updateItemProperty(itemId: string, propertyId: string, value: ItemPropertyValue): Promise<void> {
    return (await this.target()).updateItemProperty(itemId, propertyId, value);
  }
  async updateItemLabels(itemId: string, labels: string[]): Promise<void> {
    return (await this.target()).updateItemLabels(itemId, labels);
  }
  async addLabelToItem(itemId: string, labelId: string): Promise<void> {
    return (await this.target()).addLabelToItem(itemId, labelId);
  }
  async removeLabelFromItem(itemId: string, labelId: string): Promise<void> {
    return (await this.target()).removeLabelFromItem(itemId, labelId);
  }
  async updateItemContent(itemId: string, patch: ItemContentPatch): Promise<void> {
    return (await this.target()).updateItemContent(itemId, patch);
  }
  async deleteItem(itemId: string): Promise<void> {
    return (await this.target()).deleteItem(itemId);
  }
  async listCollections(): Promise<SmartCollection[]> {
    return (await this.target()).listCollections();
  }
  async saveCollection(input: SaveCollectionInput): Promise<SmartCollection> {
    return (await this.target()).saveCollection(input);
  }
  async deleteCollection(id: string): Promise<void> {
    return (await this.target()).deleteCollection(id);
  }
  async exportSnapshot(): Promise<TagsSnapshot> {
    return (await this.target()).exportSnapshot();
  }
  async importSnapshot(snapshot: TagsSnapshot, options?: { origin?: LabelStoreChangeOrigin }): Promise<MergeStats> {
    return (await this.target()).importSnapshot(snapshot, options);
  }
}

const facade = new ActiveLabelStore();

/** Açık hesabın deposu (arayüz için). Nesne sabittir, hesap değişince içi değişir. */
export function getActiveLabelStore(): SyncableLabelStore {
  return facade;
}

// --- Eski tek depodan taşıma ---

interface MigrationRecord {
  /** Taşıma bitti; eski depo bir daha okunmaz. */
  done?: boolean;
  /** Eski depoyu alacak hesap. Kopyalamadan önce yazılır: yarıda kalırsa yalnız bu hesap tamamlar. */
  target?: string;
  /**
   * Yükseltme anında bağlı görünen hesabın e-posta özeti; yalnız o hesap alır.
   * `null`: bilinmiyor, ilk bağlanan hesap alır. Alan yoksa henüz bakılmadı.
   */
  ownerHint?: string | null;
}

function readMigration(): MigrationRecord {
  try {
    const raw = readValue(LEGACY_STORE_MIGRATION_STORAGE_KEY);
    const value = raw ? (JSON.parse(raw) as MigrationRecord) : {};
    return {
      done: value.done === true,
      target: isStoreKey(value.target) ? value.target : undefined,
      ownerHint: value.ownerHint === null || isStoreKey(value.ownerHint) ? value.ownerHint : undefined,
    };
  } catch {
    return {};
  }
}

function writeMigration(record: MigrationRecord): void {
  writeValue(LEGACY_STORE_MIGRATION_STORAGE_KEY, JSON.stringify(record));
}

function isEmptySnapshot(snapshot: TagsSnapshot): boolean {
  return [snapshot.labels, snapshot.items, snapshot.propertyDefinitions, snapshot.collections, snapshot.tombstones].every(
    (records) => records.length === 0
  );
}

function withMigrationLock<T>(run: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  return locks ? (locks.request(MIGRATION_LOCK, run) as Promise<T>) : run();
}

export type LegacyMigrationResult = "none" | "migrated" | "waiting";

export interface ActivateAccountOptions {
  /** Bağlanan hesabın e-postası; eski deponun sahibiyle karşılaştırılır. */
  email?: string | null;
  /** Yükseltmeden önce bu tarayıcıda kayıtlı hesabın e-postası (eski deponun sahibi). */
  legacyOwnerEmail?: string | null;
  /** Kullanıcı eski etiketleri açıkça bu hesaba almak istedi. */
  claimLegacy?: boolean;
}

/**
 * Eski depoyu bir kez ve kayıpsız taşır: önce hedef yazılır, sonra veri son yazan
 * kazanır kuralıyla birleştirilir (tekrar çalışması zararsız), en son eski depo silinir.
 * Kopyalama tek transaction'dır; arada kesilirse sonraki çalıştırma aynı hedefe tamamlar.
 */
async function migrateLegacy(storeKey: string, options: ActivateAccountOptions): Promise<LegacyMigrationResult> {
  let record = readMigration();
  if (record.done) return "none";
  if (record.ownerHint === undefined) {
    record = { ...record, ownerHint: options.legacyOwnerEmail ? await ownerHintFor(options.legacyOwnerEmail) : null };
    writeMigration(record);
  }
  if (record.target && record.target !== storeKey) return "waiting";
  if (!record.target) {
    const owned =
      options.claimLegacy === true ||
      record.ownerHint === null ||
      (!!options.email && record.ownerHint === (await ownerHintFor(options.email)));
    if (!owned) return "waiting";
    record = { ...record, target: storeKey };
    writeMigration(record);
  }

  const legacy = await concreteStore(null).exportSnapshot();
  const copied = !isEmptySnapshot(legacy);
  if (copied) await concreteStore(storeKey).importSnapshot(legacy, { origin: "sync" });
  const legacyState = readValue(backupStateKeyFor(null));
  if (legacyState && !readValue(backupStateKeyFor(storeKey))) writeValue(backupStateKeyFor(storeKey), legacyState);
  writeMigration({ ...record, done: true });
  // Silinemezse veri zaten kopyalandı; eski depo bir daha okunmaz.
  await deleteLocalDatabase(LEGACY_DATABASE_NAME).catch(() => undefined);
  return copied ? "migrated" : "none";
}

export interface ActivateAccountResult {
  /** Açık depo başka hesaptan bu hesaba geçti. */
  switched: boolean;
  /** Önceki açık depo bir hesaba aitti (ilk bağlanma değil). */
  fromOtherAccount: boolean;
  legacy: LegacyMigrationResult;
}

/** Hesabın deposunu açar; gerekirse eski depoyu taşır. Bitene kadar arayüz çağrıları bekler. */
export function activateAccountStore(storeKey: string, options: ActivateAccountOptions = {}): Promise<ActivateAccountResult> {
  if (!isStoreKey(storeKey)) return Promise.reject(new Error("Invalid store key"));
  const run = switching
    .catch(() => undefined)
    .then(() =>
      withMigrationLock(async () => {
        const previous = getActiveStoreKey();
        const legacy = await migrateLegacy(storeKey, options);
        const switched = setActiveStoreKey(storeKey);
        return { switched, fromOtherAccount: switched && previous !== null, legacy };
      })
    );
  switching = run;
  return run;
}

/** Eski depoda bu hesaba ait olduğu kanıtlanamamış etiket var mı? (Başka hesaba ayrılmışsa hayır.) */
export async function hasUnclaimedLegacyLabels(): Promise<boolean> {
  const record = readMigration();
  if (record.done || record.target) return false;
  return !isEmptySnapshot(await concreteStore(null).exportSnapshot());
}

/** Kullanıcı eski etiketleri açık hesaba almak istedi. */
export async function claimLegacyLabels(): Promise<LegacyMigrationResult> {
  const storeKey = getActiveStoreKey();
  if (!storeKey) return "none";
  // Açık deponun kendi "sync" olayı ekranları yeniler.
  return (await activateAccountStore(storeKey, { claimLegacy: true })).legacy;
}

/** Yalnız açık hesabın bu tarayıcıdaki verisini siler. Diğer hesapların depoları kalır. */
export async function deleteActiveLabelData(): Promise<void> {
  await switching.catch(() => undefined);
  await deleteLocalDatabase(databaseNameFor(getActiveStoreKey()));
}

/** Yalnız testler: modül durumunu sıfırlar (veritabanları ayrıca silinir). */
export function resetAccountStoresForTests(): void {
  memory.clear();
  stores.clear();
  activeKey = undefined;
  switching = Promise.resolve();
  activeListeners.clear();
}
