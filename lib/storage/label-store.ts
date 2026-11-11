/**
 * Etiket verisi sözleşmesi: etiketler, etiketli öğeler, özellik tanımları ve
 * akıllı koleksiyonlar tek bu arayüzden okunur/yazılır. Uygulama:
 * `indexeddb-label-store.ts`; Drive yedeği `drive-backup.ts` ile aynı biçimi kullanır.
 */
import type {
  FileRelation,
  Label,
  LabelItem,
  NoteBlock,
  PropertyDefinition,
  SmartCollection,
  TaggedItem,
} from "@/lib/types";
import type { MergeStats } from "./merge";
import type { TagsSnapshot } from "./snapshot";

export type TagItemInput = Omit<TaggedItem, "addedAt" | "updatedAt" | "properties" | "notes">;
export type ItemPropertyValue = TaggedItem["properties"][string];
export type ItemContentPatch = { notes?: NoteBlock[]; relations?: FileRelation[] };
export type SaveCollectionInput = Omit<SmartCollection, "id" | "createdAt" | "updatedAt"> & { id?: string };

export interface LabelDefinitions {
  labels: LabelItem[];
  propertyDefinitions: PropertyDefinition[];
}

export interface LabelStore {
  /** Etiket ve özellik tanımlarını birlikte okur. */
  loadDefinitions(): Promise<LabelDefinitions>;
  /** Geçersiz renk reddedilir (bkz. `isValidLabelColor`). */
  createLabel(label: Omit<Label, "createdAt">): Promise<void>;
  /** Etiketleri günceller, silinenleri öğelerden de çıkarır. */
  updateLabels(updated: LabelItem[], deletedIds: string[]): Promise<void>;
  savePropertyDefinition(definition: PropertyDefinition): Promise<void>;
  deletePropertyDefinition(id: string): Promise<void>;

  listTaggedItems(): Promise<Record<string, TaggedItem>>;
  getItemsByLabel(labelId: string): Promise<TaggedItem[]>;
  /** Oluşturur ya da günceller; değeri `undefined` olan alanlar kayıttan silinir. */
  tagItem(item: TagItemInput): Promise<void>;
  /** Öğe yoksa oluşturur. */
  updateItemProperty(itemId: string, propertyId: string, value: ItemPropertyValue): Promise<void>;
  /** Öğe yoksa `code: "not-found"` hatası verir. */
  updateItemLabels(itemId: string, labels: string[]): Promise<void>;
  /** Öğe yoksa "Unknown File" adıyla oluşturur. */
  addLabelToItem(itemId: string, labelId: string): Promise<void>;
  /** Öğe yoksa `code: "not-found"` hatası verir. */
  removeLabelFromItem(itemId: string, labelId: string): Promise<void>;
  /** Not ve ilişkileri yazar; öğe yoksa oluşturur. */
  updateItemContent(itemId: string, patch: ItemContentPatch): Promise<void>;
  deleteItem(itemId: string): Promise<void>;

  listCollections(): Promise<SmartCollection[]>;
  saveCollection(input: SaveCollectionInput): Promise<SmartCollection>;
  deleteCollection(id: string): Promise<void>;

  exportSnapshot(): Promise<TagsSnapshot>;
}

/** "local": kullanıcının değişikliği, yedeklenmeli. "sync": Drive'dan gelen, yalnız ekran yenilenir. */
export type LabelStoreChangeOrigin = "local" | "sync";
export type LabelStoreListener = (origin: LabelStoreChangeOrigin) => void;

/** Dışarıdan veri alabilen depo: anlık görüntüyü son yazan kazanır kuralıyla birleştirir. */
export interface SyncableLabelStore extends LabelStore {
  importSnapshot(snapshot: TagsSnapshot, options?: { origin?: LabelStoreChangeOrigin }): Promise<MergeStats>;
  /** Veri diske yazıldıktan sonra haber verir. Dönen işlev aboneliği bitirir. */
  subscribe(listener: LabelStoreListener): () => void;
}

export function notFoundError(message: string): Error {
  return Object.assign(new Error(message), { code: "not-found" });
}
