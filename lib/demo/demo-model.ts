/**
 * /demo çekirdeği: saf, bellek içi (ağ, depolama, kimlik YOK). Panelde kullanılan GERÇEK arama motoru
 * (`createSearchEngine`, `extractInlineChips`) örnek veri üzerinde çalışır; böylece "arama ve etiket süzgeci"
 * davranışı uygulamayla aynıdır (etiket çipleri VE ile daralır: `itemMatchesAllChips`).
 *
 * Durum yalnız bu modülün fonksiyonlarıyla değişir ve her çağrı yeni bir nesne döndürür (React durumu için).
 */

import type { DriveFile, LabelItem, TaggedItem } from "@/lib/types";
import { PRESET_COLORS } from "@/lib/constants/colors";
import { createSearchEngine, extractInlineChips, type SearchChip } from "@/lib/search";
import { chipText, type ChipPrefixes } from "@/lib/search/query-parser";
import { getTranslation } from "@/lib/i18n/i18n";
import { DEMO_FILES, DEMO_LABELS, type DemoSampleFile } from "./sample-data";

export const MAX_TAG_NAME_LENGTH = 40;
/** Demo'da bir ziyaretçinin toplam (örnek + yeni) etiket sayısı tavanı: sınırsız büyümesin. */
export const MAX_DEMO_LABELS = 24;

export interface DemoState {
  files: DemoSampleFile[];
  labels: LabelItem[];
  /** dosya kimliği -> etiket kimlikleri (uygulanma sırasıyla). */
  tags: Record<string, string[]>;
}

export function createInitialState(): DemoState {
  return {
    files: DEMO_FILES.map((f) => ({ ...f })),
    labels: DEMO_LABELS.map((l) => ({ ...l })),
    tags: Object.fromEntries(DEMO_FILES.map((f) => [f.id, [...f.labelIds]])),
  };
}

export function labelsOf(state: DemoState, fileId: string): LabelItem[] {
  const ids = state.tags[fileId] ?? [];
  return ids.map((id) => state.labels.find((l) => l.id === id)).filter((l): l is LabelItem => Boolean(l));
}

/** Etiket başına kaç dosyada kullanıldığı. */
export function tagCounts(state: DemoState): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(state.labels.map((l) => [l.id, 0]));
  for (const ids of Object.values(state.tags)) for (const id of ids) if (id in counts) counts[id] += 1;
  return counts;
}

export function addTag(state: DemoState, fileId: string, labelId: string): DemoState {
  if (!state.files.some((f) => f.id === fileId)) return state;
  if (!state.labels.some((l) => l.id === labelId)) return state;
  const current = state.tags[fileId] ?? [];
  if (current.includes(labelId)) return state;
  return { ...state, tags: { ...state.tags, [fileId]: [...current, labelId] } };
}

export function removeTag(state: DemoState, fileId: string, labelId: string): DemoState {
  const current = state.tags[fileId];
  if (!current || !current.includes(labelId)) return state;
  return { ...state, tags: { ...state.tags, [fileId]: current.filter((id) => id !== labelId) } };
}

export type CreateTagError = "empty" | "too-long" | "limit";

export interface CreateTagResult {
  state: DemoState;
  labelId: string | null;
  error: CreateTagError | null;
}

/** Boşlukları sadeleştirir; büyük/küçük harf ve aksan duyarsız karşılaştırma için kullanılır. */
export function normalizeTagName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, "en", { sensitivity: "base" }) === 0;
}

/**
 * Yeni etiket oluşturur ve dosyaya uygular. Aynı adlı etiket varsa (harf boyutu duyarsız) yenisi açılmaz,
 * var olan uygulanır. Ad 1..{@link MAX_TAG_NAME_LENGTH} karakter; etiket sayısı {@link MAX_DEMO_LABELS} ile sınırlı.
 */
export function createTag(state: DemoState, fileId: string, rawName: string): CreateTagResult {
  const name = normalizeTagName(rawName);
  if (name.length === 0) return { state, labelId: null, error: "empty" };
  if (name.length > MAX_TAG_NAME_LENGTH) return { state, labelId: null, error: "too-long" };
  if (!state.files.some((f) => f.id === fileId)) return { state, labelId: null, error: "empty" };
  const existing = state.labels.find((l) => sameName(l.name, name));
  if (existing) return { state: addTag(state, fileId, existing.id), labelId: existing.id, error: null };
  if (state.labels.length >= MAX_DEMO_LABELS) return { state, labelId: null, error: "limit" };
  const id = `l-new-${state.labels.length + 1}`;
  const label: LabelItem = { id, name, color: PRESET_COLORS[state.labels.length % PRESET_COLORS.length] };
  const next: DemoState = { ...state, labels: [...state.labels, label] };
  return { state: addTag(next, fileId, id), labelId: id, error: null };
}

export function toggleFilter(activeIds: string[], labelId: string): string[] {
  return activeIds.includes(labelId) ? activeIds.filter((id) => id !== labelId) : [...activeIds, labelId];
}

/** Uygulamadaki arama çipi başlıkları (İngilizce): "Label is Approved". */
const EN_PREFIXES: ChipPrefixes = {
  label: getTranslation("en", "dashboard.search.filterLabel"),
  type: getTranslation("en", "dashboard.search.filterType"),
  date: getTranslation("en", "dashboard.search.filterDate"),
  format: getTranslation("en", "dashboard.search.chipFormat"),
};

function toTaggedItems(state: DemoState): TaggedItem[] {
  const added = new Date("2026-10-01T00:00:00Z");
  return state.files.map((f) => ({
    itemId: f.id,
    name: f.name,
    type: "file" as const,
    mimeType: f.mimeType,
    labels: state.tags[f.id] ?? [],
    properties: {},
    notes: [],
    addedAt: added,
    updatedAt: added,
  }));
}

export interface DemoQuery {
  /** Arama kutusundaki ham metin ("invoice", "label:Approved acme" gibi). */
  text: string;
  /** Etiket çubuğunda seçili etiket kimlikleri (hepsi birden aranır). */
  filterLabelIds: string[];
}

export interface DemoSearchResult {
  files: DriveFile[];
  /** Uygulanan çiplerin başlıkları: "Label is Approved". */
  chips: { id: string; text: string }[];
  /** `label:Ad` kısayolundan çıkan ve metinden ayrılan çipler dahil. */
  residualText: string;
}

/**
 * Gerçek arama motoruyla arar. Metindeki çözülebilir `label:Ad` kısayolları uygulamadaki gibi çipe dönüşür;
 * etiket çubuğundan seçilenlerle birlikte VE ile daraltır. Sorgu boşsa bütün örnek dosyalar gelir.
 */
export function searchDemo(state: DemoState, query: DemoQuery): DemoSearchResult {
  const engine = createSearchEngine({ files: state.files, taggedItems: toTaggedItems(state), labels: state.labels, properties: [] });
  const parsed = extractInlineChips(query.text, { labels: state.labels, properties: [], prefixes: EN_PREFIXES });
  const barChips: SearchChip[] = query.filterLabelIds
    .map((id) => state.labels.find((l) => l.id === id))
    .filter((l): l is LabelItem => Boolean(l))
    .map((l) => ({ id: `bar-${l.id}`, kind: "label" as const, labelId: l.id, displayLabel: chipText(EN_PREFIXES.label, l.name, EN_PREFIXES.format) }));
  const chips = [...barChips, ...parsed.chips.filter((c) => !barChips.some((b) => b.labelId === c.labelId))];
  const results = engine.search({ text: parsed.text, chips });
  return {
    files: results.map((r) => r.file),
    chips: chips.map((c) => ({ id: c.id, text: c.displayLabel })),
    residualText: parsed.text,
  };
}

/** Ayrıntı panelinde "Add tag" listesi: dosyada olmayan etiketler. */
export function availableTags(state: DemoState, fileId: string): LabelItem[] {
  const applied = new Set(state.tags[fileId] ?? []);
  return state.labels.filter((l) => !applied.has(l.id));
}
