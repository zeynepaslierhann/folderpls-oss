/**
 * Etiketli öğenin not ve ilişki listeleri için doğrulama ve normalleştirme
 * (saf fonksiyonlar, birim testli). Yerel depo yazarken ve içe aktarılan yedek
 * okunurken aynı kurallar uygulanır. Sınırlar bilerek cömert: meşru kullanım
 * bunların çok altında kalır.
 *
 * Politika "sıkı red" değil "onar ya da kırp": eski dışa aktarımlarda id'si boş
 * not, beyaz liste dışı tür ya da sınırı aşan metin bulunabilir. Bunları
 * reddetmek o öğenin notlarını kalıcı olarak kilitlerdi. Bu yüzden:
 * - Hata: nesne olmayan öğe, metin olmayan içerik/not ve yeni sınır aşımı.
 * - Sınır aşımı (adet, içerik/not uzunluğu): sınırlar yeni içerik için geçerli.
 *   Çağıran saklı kaydın ölçülerini (`stored`) verirse saklı en büyük TEK değer
 *   üst sınır olur: eski bir not düzenlenebilir, kısaltılabilir, silinebilir ama
 *   saklı en büyük değerden daha da büyütülemez. Sınır not ve liste başınadır,
 *   toplam için değil; amaç güvenlik değil kilitlenmeyi önlemektir.
 * - Onarılır (içerik kaybolmaz): geçersiz/boş not id'si → listede benzersiz
 *   `legacy_<sıra>`; bilinmeyen not türü → "text"; bilinmeyen ilişki türü →
 *   alan düşer.
 * - Kırpılır: Drive kimliği biçimine uymayan `targetFileId`'li ilişki (hedefi
 *   açılamaz).
 * Onarım/kırpma/eski-sınır-aşımı sayısı `repaired` ile döner.
 */
import type { FileRelation, NoteBlock } from "@/lib/types";

/** Drive dosya/klasör kimlikleri: harf, rakam, `_`, `-` (auto-tag ile aynı kural). */
export const DRIVE_ITEM_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export const MAX_NOTES = 500;
export const MAX_RELATIONS = 500;
export const MAX_NOTE_CONTENT_LENGTH = 50_000;
export const MAX_NOTE_ID_LENGTH = 128;
export const MAX_RELATION_NOTE_LENGTH = 5_000;

export const NOTE_TYPES: readonly NoteBlock["type"][] = ["text", "heading", "todo", "bullet", "code"];
export const RELATION_TYPES: readonly NonNullable<FileRelation["relationType"]>[] = [
  "reference",
  "dependency",
  "related",
  "parent-child",
  "version",
];

/** Liste sonucu: `repaired` = onarılan ya da kırpılan öğe/alan sayısı (0 = girdi zaten temizdi). */
export type ListValidationResult<T> = { ok: true; value: T; repaired: number } | { ok: false; error: string };

/** Tek öğe normalleştirmesi: `null` değer = öğe kırpıldı (listeye girmez). */
type ItemResult = { ok: true; value: Record<string, unknown> | null; repaired: boolean } | { ok: false; error: string };

/**
 * Saklı kaydın mevcut ölçüleri: eski kayıtlar sınırsız saklanmış olabileceği için sınırı
 * aşan veri olabilir. Yeni sınır `max(sabit sınır, saklı en büyük değer)`.
 */
export interface StoredLimits {
  /** Saklı dizideki öğe sayısı. */
  count: number;
  /** Saklı öğelerdeki en uzun metin (not içeriği / ilişki notu) uzunluğu. */
  longest: number;
}

export const NO_STORED_LIMITS: StoredLimits = { count: 0, longest: 0 };

/** Sınır aşımı hataları: yalnız bunlar için saklı doküman okunup eski veri esnetilir. */
const LIMIT_ERRORS: ReadonlySet<string> = new Set([
  "too_many_notes",
  "too_many_relations",
  "note_too_long",
  "relation_note_too_long",
]);

export function isLimitError(error: string): boolean {
  return LIMIT_ERRORS.has(error);
}

/** Saklı dizi (depodan gelen, güvenilmeyen biçim) için `StoredLimits` çıkarır. */
export function storedLimits(stored: unknown, textField: "content" | "note"): StoredLimits {
  if (!Array.isArray(stored)) return NO_STORED_LIMITS;
  let longest = 0;
  for (const item of stored) {
    if (!isPlainObject(item)) continue;
    const text = item[textField];
    if (typeof text === "string" && text.length > longest) longest = text.length;
  }
  return { count: stored.length, longest };
}

export function isValidItemId(value: unknown): value is string {
  return typeof value === "string" && DRIVE_ITEM_ID_PATTERN.test(value);
}

function parseDate(v: unknown): Date {
  let d: Date | null = null;
  if (v instanceof Date) d = v;
  else if (typeof v === "string" || typeof v === "number") d = new Date(v);
  else if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    d = (v as { toDate: () => Date }).toDate();
  }
  // Geçersiz tarih şimdiye düşer.
  return d && !Number.isNaN(d.getTime()) ? d : new Date();
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidNoteId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= MAX_NOTE_ID_LENGTH;
}

/**
 * Yalnız tanımlı alanlarla düz nesne üretir.
 * `id` geçersizse `null` bırakılır; `normalizeNotes` liste genelinde benzersiz
 * bir onarım kimliği atar.
 */
function normalizeNoteBlock(raw: Record<string, unknown>, stored: StoredLimits): ItemResult {
  let repaired = !isValidNoteId(raw.id);
  const id = repaired ? null : raw.id;

  let type = raw.type ?? "text";
  if (typeof type !== "string" || !(NOTE_TYPES as readonly string[]).includes(type)) {
    type = "text";
    repaired = true;
  }
  const content = raw.content ?? "";
  if (typeof content !== "string") return { ok: false, error: "invalid_note" };
  // Eski (sınırsız) kayıt: saklı en uzun metni aşmayan sınır üstü içerik kabul edilir.
  if (content.length > Math.max(MAX_NOTE_CONTENT_LENGTH, stored.longest)) {
    return { ok: false, error: "note_too_long" };
  }
  if (content.length > MAX_NOTE_CONTENT_LENGTH) repaired = true;

  const out: Record<string, unknown> = { id, type, content, createdAt: parseDate(raw.createdAt) };
  if (typeof raw.checked === "boolean") out.checked = raw.checked;
  return { ok: true, value: out, repaired };
}

function normalizeFileRelation(raw: Record<string, unknown>, stored: StoredLimits): ItemResult {
  let repaired = false;
  if (raw.note != null && raw.note !== "") {
    if (typeof raw.note !== "string") return { ok: false, error: "invalid_relation" };
    if (raw.note.length > Math.max(MAX_RELATION_NOTE_LENGTH, stored.longest)) {
      return { ok: false, error: "relation_note_too_long" };
    }
    if (raw.note.length > MAX_RELATION_NOTE_LENGTH) repaired = true;
  }
  // Hedefi Drive kimliği olmayan ilişki açılamaz: kırpılır (eski kayıtlarda "" olabilir).
  if (!isValidItemId(raw.targetFileId)) return { ok: true, value: null, repaired: true };

  const out: Record<string, unknown> = {
    targetFileId: raw.targetFileId,
    createdAt: parseDate(raw.createdAt),
  };
  if ((raw.relationType ?? "") !== "") {
    if (
      typeof raw.relationType === "string" &&
      (RELATION_TYPES as readonly string[]).includes(raw.relationType)
    ) {
      out.relationType = raw.relationType;
    } else {
      repaired = true;
    }
  }
  if (typeof raw.note === "string" && raw.note !== "") out.note = raw.note;
  return { ok: true, value: out, repaired };
}

function normalizeList(
  raw: unknown[],
  max: number,
  tooManyError: string,
  normalize: (item: Record<string, unknown>, stored: StoredLimits) => ItemResult,
  invalidError: string,
  stored: StoredLimits
): ListValidationResult<Record<string, unknown>[]> {
  // Eski kayıtlarda adet sınırı yoktu: saklı dizi sınırı aşıyorsa liste ondan
  // daha da uzayamaz ama aynı uzunlukta kalabilir/kısalabilir.
  if (raw.length > Math.max(max, stored.count)) return { ok: false, error: tooManyError };
  const out: Record<string, unknown>[] = [];
  let repaired = raw.length > max ? 1 : 0;
  for (const item of raw) {
    if (!isPlainObject(item)) return { ok: false, error: invalidError };
    const r = normalize(item, stored);
    if (!r.ok) return r;
    if (r.repaired) repaired++;
    if (r.value) out.push(r.value);
  }
  return { ok: true, value: out, repaired };
}

/**
 * @param stored saklı dokümandaki mevcut `notes` ölçüleri (`storedLimits(doc.notes, "content")`);
 *   verilmezse yeni sınırlar aynen uygulanır.
 */
export function normalizeNotes(
  raw: unknown[],
  stored: StoredLimits = NO_STORED_LIMITS
): ListValidationResult<Record<string, unknown>[]> {
  const result = normalizeList(raw, MAX_NOTES, "too_many_notes", normalizeNoteBlock, "invalid_note", stored);
  if (!result.ok) return result;
  // Geçersiz id'li notlara listede çakışmayan, sıraya bağlı (aynı girdide aynı
  // sonucu veren) bir kimlik ata: `legacy_<sıra>`, gerekirse `_2`, `_3`...
  const used = new Set(result.value.map((n) => n.id).filter((id): id is string => typeof id === "string"));
  result.value.forEach((note, index) => {
    if (note.id !== null) return;
    let candidate = `legacy_${index}`;
    for (let n = 2; used.has(candidate); n++) candidate = `legacy_${index}_${n}`;
    used.add(candidate);
    note.id = candidate;
  });
  return result;
}

/** @param stored saklı dokümandaki mevcut `relations` ölçüleri (`storedLimits(doc.relations, "note")`). */
export function normalizeRelations(
  raw: unknown[],
  stored: StoredLimits = NO_STORED_LIMITS
): ListValidationResult<Record<string, unknown>[]> {
  return normalizeList(raw, MAX_RELATIONS, "too_many_relations", normalizeFileRelation, "invalid_relation", stored);
}
