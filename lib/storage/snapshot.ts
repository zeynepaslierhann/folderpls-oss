/**
 * Sürümlü JSON şeması: dışa aktarma dosyası, Drive yedeği ve IndexedDB kayıtları
 * aynı biçimi kullanır (tarihler ISO 8601 metni). Böylece yedek insan tarafından
 * okunabilir ve kayıt ile dosya arasında dönüşüm kaybı olmaz.
 *
 * Şema değişince `SNAPSHOT_SCHEMA_VERSION` artırılır ve eski sürümü yeniye çeviren
 * dönüşüm `parseSnapshot` içine eklenir. Dosya uygulamadan yeni bir sürümdeyse
 * okunmaz: bilinmeyen alanları düşürüp yedeğin üzerine yazmak veri kaybettirir.
 */
import { isValidLabelColor } from "@/lib/constants/colors";
import { isCollectionNameTooLong, isFilterGroupTooLarge } from "@/lib/collections/limits";
import { isValidItemId, normalizeNotes, normalizeRelations } from "@/lib/tagged-items/validation";
import type { FilterCondition, FilterFieldType, FilterGroup, FilterOperator, TaggedItem } from "@/lib/types";

export const SNAPSHOT_SCHEMA_VERSION = 1;
export const SNAPSHOT_APP_ID = "folderpls-tags";
export const MAX_SNAPSHOT_CHARS = 25 * 1024 * 1024;

const MAX_ID_LENGTH = 128;
const MAX_TEXT_LENGTH = 1024;
export const MAX_PROPERTY_TEXT_LENGTH = MAX_TEXT_LENGTH;
/** Öğe başına özellik sayısı ve çoklu seçim dizisinin öğe sayısı. */
export const MAX_ITEM_PROPERTIES = 200;
export const MAX_PROPERTY_VALUES = 100;

export interface SnapshotLabel {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface SnapshotNote {
  id: string;
  type: "text" | "heading" | "todo" | "bullet" | "code";
  content: string;
  checked?: boolean;
  createdAt: string;
}

export interface SnapshotRelation {
  targetFileId: string;
  relationType?: "reference" | "dependency" | "related" | "parent-child" | "version";
  note?: string;
  createdAt: string;
}

export interface SnapshotItem {
  itemId: string;
  name: string;
  type: "file" | "folder";
  mimeType?: string;
  labels: string[];
  labelExpiries?: Record<string, number>;
  properties: TaggedItem["properties"];
  notes: SnapshotNote[];
  relations: SnapshotRelation[];
  parentId?: string;
  addedAt: string;
  updatedAt: string;
}

export interface SnapshotPropertyOption {
  id: string;
  name: string;
  color: string;
  textColor?: string;
  isPreset?: boolean;
  createdAt?: string;
}

export interface SnapshotPropertyDefinition {
  id: string;
  name: string;
  type: "text" | "number" | "select" | "multi-select" | "date" | "checkbox" | "status";
  options?: SnapshotPropertyOption[];
  isBuiltin?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SnapshotCollection {
  id: string;
  name: string;
  filterGroup: FilterGroup;
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export type TombstoneKind = "label" | "item" | "propertyDefinition" | "collection";

export interface SnapshotTombstone {
  kind: TombstoneKind;
  id: string;
  deletedAt: string;
}

export interface TagsSnapshot {
  schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  app: typeof SNAPSHOT_APP_ID;
  exportedAt: string;
  labels: SnapshotLabel[];
  items: SnapshotItem[];
  propertyDefinitions: SnapshotPropertyDefinition[];
  collections: SnapshotCollection[];
  tombstones: SnapshotTombstone[];
}

export type SnapshotData = Omit<TagsSnapshot, "schemaVersion" | "app" | "exportedAt">;

export function buildSnapshot(data: SnapshotData, exportedAt: string = new Date().toISOString()): TagsSnapshot {
  return { schemaVersion: SNAPSHOT_SCHEMA_VERSION, app: SNAPSHOT_APP_ID, exportedAt, ...data };
}

export function serializeSnapshot(snapshot: TagsSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export type SnapshotErrorCode = "invalid_json" | "not_folderpls" | "unsupported_version" | "too_large";

export class SnapshotError extends Error {
  code: SnapshotErrorCode;
  constructor(code: SnapshotErrorCode) {
    super(code);
    this.name = "SnapshotError";
    this.code = code;
  }
}

export interface ParsedSnapshot {
  snapshot: TagsSnapshot;
  /** Geçersiz olduğu için alınmayan kayıt sayısı. */
  skipped: number;
}

/**
 * Tarih benzeri bir değeri ISO metnine çevirir; çözülemezse `null`. Eski
 * dışa aktarımlardaki zaman damgası nesnelerini (`toDate`, `_seconds`), `Date`,
 * metin ve milisaniyeyi kabul eder.
 */
export function toIsoDate(value: unknown): string | null {
  let date: Date | null = null;
  if (value instanceof Date) date = value;
  else if (typeof value === "string" || typeof value === "number") date = new Date(value);
  else if (value && typeof value === "object") {
    const v = value as { toDate?: () => Date; _seconds?: number; seconds?: number };
    if (typeof v.toDate === "function") date = v.toDate();
    else if (typeof v._seconds === "number") date = new Date(v._seconds * 1000);
    else if (typeof v.seconds === "number") date = new Date(v.seconds * 1000);
  }
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_ID_LENGTH;
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_TEXT_LENGTH;
}

/** JSON.parse `__proto__`'yu kendi alanı yapar; düz nesneye atanırsa prototipi değiştirirdi. */
function isSafeKey(key: string): boolean {
  return isId(key) && key !== "__proto__" && key !== "constructor" && key !== "prototype";
}

function optional<K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } {
  return (value === undefined ? {} : { [key]: value }) as { [P in K]?: V };
}

/** `label.color` doğrudan CSS'e gider: yalnız onaylı biçimler (bkz. `isValidLabelColor`). */
const SAFE_OPTION_COLOR = /^hsl\(var\(--[a-z0-9-]+\)\)$/;
const FALLBACK_OPTION_COLOR = "#476CA6";

function isSafeOptionColor(value: unknown): value is string {
  return isValidLabelColor(value) || (typeof value === "string" && SAFE_OPTION_COLOR.test(value));
}

function sanitizeLabel(raw: Record<string, unknown>): SnapshotLabel | null {
  const updatedAt = toIsoDate(raw.updatedAt);
  if (!isId(raw.id) || !isText(raw.name) || !raw.name || !isValidLabelColor(raw.color) || !updatedAt) return null;
  return { id: raw.id, name: raw.name, color: raw.color, createdAt: toIsoDate(raw.createdAt) ?? updatedAt, updatedAt };
}

/** Yazarken boyut sınırı: metin ve dizi öğesi `MAX_PROPERTY_TEXT_LENGTH`, dizi `MAX_PROPERTY_VALUES`. */
export function isPropertyValueTooLarge(value: unknown): boolean {
  if (typeof value === "string") return !isText(value);
  if (!Array.isArray(value)) return false;
  return value.length > MAX_PROPERTY_VALUES || value.some((entry) => typeof entry === "string" && !isText(entry));
}

/** Metin ve dizi öğeleri diğer metin alanlarıyla aynı sınırda; dizi en çok `MAX_PROPERTY_VALUES` öğe. */
function isValidPropertyValue(value: unknown): value is TaggedItem["properties"][string] {
  if (typeof value === "string") return isText(value);
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  return Array.isArray(value) && value.length <= MAX_PROPERTY_VALUES && value.every((entry) => typeof entry === "string" && isText(entry));
}

function sanitizeProperties(raw: unknown): TaggedItem["properties"] {
  const out: TaggedItem["properties"] = {};
  if (!isRecord(raw)) return out;
  let count = 0;
  for (const [key, value] of Object.entries(raw)) {
    if (count >= MAX_ITEM_PROPERTIES) break;
    if (!isSafeKey(key) || !isValidPropertyValue(value)) continue;
    out[key] = value;
    count += 1;
  }
  return out;
}

function sanitizeExpiries(raw: unknown): Record<string, number> | undefined {
  if (!isRecord(raw)) return undefined;
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (isSafeKey(key) && typeof value === "number" && Number.isFinite(value)) out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function sanitizeItem(raw: Record<string, unknown>): SnapshotItem | null {
  const updatedAt = toIsoDate(raw.updatedAt);
  if (!isValidItemId(raw.itemId) || !updatedAt) return null;
  if (raw.type !== undefined && raw.type !== "file" && raw.type !== "folder") return null;
  if (raw.labels !== undefined && !Array.isArray(raw.labels)) return null;

  const notes = normalizeNotes(Array.isArray(raw.notes) ? raw.notes : []);
  const relations = normalizeRelations(Array.isArray(raw.relations) ? raw.relations : []);
  if (!notes.ok || !relations.ok) return null;

  return {
    itemId: raw.itemId,
    name: isText(raw.name) ? raw.name : "",
    type: raw.type === "folder" ? "folder" : "file",
    ...optional("mimeType", isText(raw.mimeType) ? raw.mimeType : undefined),
    labels: [...new Set(((raw.labels as unknown[] | undefined) ?? []).filter(isId))],
    ...optional("labelExpiries", sanitizeExpiries(raw.labelExpiries)),
    properties: sanitizeProperties(raw.properties),
    notes: notes.value.map((note) => ({ ...note, createdAt: toIsoDate(note.createdAt) ?? updatedAt })) as unknown as SnapshotNote[],
    relations: relations.value.map((relation) => ({
      ...relation,
      createdAt: toIsoDate(relation.createdAt) ?? updatedAt,
    })) as unknown as SnapshotRelation[],
    ...optional("parentId", isValidItemId(raw.parentId) ? raw.parentId : undefined),
    addedAt: toIsoDate(raw.addedAt) ?? updatedAt,
    updatedAt,
  };
}

const PROPERTY_TYPES: readonly string[] = ["text", "number", "select", "multi-select", "date", "checkbox", "status"];

function sanitizeOption(raw: unknown): SnapshotPropertyOption | null {
  if (!isRecord(raw) || !isId(raw.id) || !isText(raw.name)) return null;
  return {
    id: raw.id,
    name: raw.name,
    color: isSafeOptionColor(raw.color) ? raw.color : FALLBACK_OPTION_COLOR,
    ...optional("textColor", isSafeOptionColor(raw.textColor) ? raw.textColor : undefined),
    ...optional("isPreset", typeof raw.isPreset === "boolean" ? raw.isPreset : undefined),
    ...optional("createdAt", toIsoDate(raw.createdAt) ?? undefined),
  };
}

function sanitizePropertyDefinition(raw: Record<string, unknown>): SnapshotPropertyDefinition | null {
  const updatedAt = toIsoDate(raw.updatedAt);
  if (!isId(raw.id) || !isText(raw.name) || !raw.name || !updatedAt) return null;
  if (typeof raw.type !== "string" || !PROPERTY_TYPES.includes(raw.type)) return null;
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type as SnapshotPropertyDefinition["type"],
    ...optional(
      "options",
      Array.isArray(raw.options)
        ? raw.options.flatMap((option) => {
            const clean = sanitizeOption(option);
            return clean ? [clean] : [];
          })
        : undefined
    ),
    ...optional("isBuiltin", typeof raw.isBuiltin === "boolean" ? raw.isBuiltin : undefined),
    createdAt: toIsoDate(raw.createdAt) ?? updatedAt,
    updatedAt,
  };
}

const FILTER_FIELD_TYPES: readonly FilterFieldType[] = ["name", "label", "property", "type", "date_modified"];
const FILTER_OPERATORS: readonly FilterOperator[] = [
  "contains", "equals", "starts_with", "ends_with", "is_empty", "is_not_empty",
  "not_equals", "greater_than", "less_than", "greater_or_equal", "less_or_equal",
  "before", "after", "on", "between", "today", "this_week", "this_month",
  "not_contains", "contains_all",
  "has_label", "not_has_label", "has_any_label", "has_no_labels",
];

/** JSON'da tarih metin olarak gelir; `[Date, Date]` aralığı da metin dizisidir. */
function sanitizeConditionValue(value: unknown): FilterCondition["value"] | undefined {
  if (typeof value === "string") return isText(value) ? value : undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (Array.isArray(value) && value.length <= MAX_PROPERTY_VALUES && value.every((entry) => typeof entry === "string" && isText(entry))) {
    return value as string[];
  }
  return undefined;
}

/**
 * Yalnız bilinen alanlar kopyalanır. Alan türü ya da işleci tanınmayan koşul
 * düşer; geçersiz ya da `null` değer yalnız `value` alanını düşürür (değersiz
 * koşul aramada yok sayılır, koleksiyon açılmaya devam eder).
 */
function sanitizeCondition(raw: unknown): FilterCondition | null {
  if (!isRecord(raw) || !isId(raw.id)) return null;
  if (typeof raw.fieldType !== "string" || !(FILTER_FIELD_TYPES as readonly string[]).includes(raw.fieldType)) return null;
  if (typeof raw.operator !== "string" || !(FILTER_OPERATORS as readonly string[]).includes(raw.operator)) return null;
  return {
    id: raw.id,
    fieldType: raw.fieldType as FilterFieldType,
    ...optional("fieldId", isId(raw.fieldId) ? raw.fieldId : undefined),
    ...optional("fieldName", isText(raw.fieldName) ? raw.fieldName : undefined),
    operator: raw.operator as FilterOperator,
    ...optional("value", sanitizeConditionValue(raw.value)),
  };
}

function sanitizeCollection(raw: Record<string, unknown>): SnapshotCollection | null {
  const updatedAt = toIsoDate(raw.updatedAt);
  const filter = raw.filterGroup;
  if (!isId(raw.id) || typeof raw.name !== "string" || !raw.name.trim() || !updatedAt) return null;
  if (isCollectionNameTooLong(raw.name) || !isRecord(filter)) return null;
  if ((filter.logic !== "and" && filter.logic !== "or") || !Array.isArray(filter.conditions)) return null;
  if (isFilterGroupTooLarge(filter as unknown as FilterGroup)) return null;
  const filterGroup: FilterGroup = {
    logic: filter.logic,
    conditions: filter.conditions.flatMap((condition) => {
      const clean = sanitizeCondition(condition);
      return clean ? [clean] : [];
    }),
  };
  return {
    id: raw.id,
    name: raw.name,
    filterGroup,
    ...optional("icon", isText(raw.icon) ? raw.icon : undefined),
    ...optional("color", isValidLabelColor(raw.color) ? raw.color : undefined),
    createdAt: toIsoDate(raw.createdAt) ?? updatedAt,
    updatedAt,
  };
}

const TOMBSTONE_KINDS: readonly string[] = ["label", "item", "propertyDefinition", "collection"];

function sanitizeTombstone(raw: Record<string, unknown>): SnapshotTombstone | null {
  const deletedAt = toIsoDate(raw.deletedAt);
  if (typeof raw.kind !== "string" || !TOMBSTONE_KINDS.includes(raw.kind) || !isId(raw.id) || !deletedAt) return null;
  return { kind: raw.kind as TombstoneKind, id: raw.id, deletedAt };
}

/**
 * Dış kaynaktan (dosya, Drive) gelen metni doğrular. Üst yapı bozuksa hata verir;
 * tek tek bozuk kayıtlar atlanır ve `skipped` ile bildirilir.
 */
export function parseSnapshot(text: string): ParsedSnapshot {
  if (text.length > MAX_SNAPSHOT_CHARS) throw new SnapshotError("too_large");

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError("invalid_json");
  }
  if (!isRecord(raw) || raw.app !== SNAPSHOT_APP_ID) throw new SnapshotError("not_folderpls");
  if (raw.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) throw new SnapshotError("unsupported_version");

  let skipped = 0;
  const collect = <T>(value: unknown, sanitize: (entry: Record<string, unknown>) => T | null): T[] => {
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw new SnapshotError("not_folderpls");
    return value.flatMap((entry) => {
      const clean = isRecord(entry) ? sanitize(entry) : null;
      if (clean === null) skipped += 1;
      return clean === null ? [] : [clean];
    });
  };

  const data: SnapshotData = {
    labels: collect(raw.labels, sanitizeLabel),
    items: collect(raw.items, sanitizeItem),
    propertyDefinitions: collect(raw.propertyDefinitions, sanitizePropertyDefinition),
    collections: collect(raw.collections, sanitizeCollection),
    tombstones: collect(raw.tombstones, sanitizeTombstone),
  };
  return { snapshot: buildSnapshot(data, toIsoDate(raw.exportedAt) ?? new Date().toISOString()), skipped };
}
