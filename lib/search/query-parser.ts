/**
 * Turns typed shorthand like `etiket:Fatura` or `tarih:2024-01-01..2024-02-01`
 * inside the free-text search box into structured filter chips, Notion/Linear
 * style — the token disappears from the text and reappears as a chip once it
 * resolves against real data (an existing label, a known property).
 *
 * Chips that can't be resolved with confidence are left as plain text rather
 * than silently discarded, so a query like "etiket:doesnotexist" still
 * searches for that literal text instead of vanishing.
 */

import type { LabelItem, PropertyDefinition } from "@/lib/types";
import { normalizeTr } from "./normalize";
import type { SearchChip, SearchChipKind } from "./types";

let chipCounter = 0;
export function createChipId(): string {
  chipCounter += 1;
  return `chip_${Date.now()}_${chipCounter}`;
}

const KEY_ALIASES: Record<string, SearchChipKind> = {
  etiket: "label",
  label: "label",
  tag: "label",
  tur: "type",
  tip: "type",
  type: "type",
  uzanti: "type",
  ext: "type",
  tarih: "dateRange",
  date: "dateRange",
  ozellik: "property",
  property: "property",
  prop: "property",
};

function splitPreservingQuotes(text: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push(m[1] !== undefined ? m[1] : m[2]);
  }
  return out;
}

function findLabel(labels: LabelItem[], rawValue: string): LabelItem | undefined {
  const normalized = normalizeTr(rawValue);
  return (
    labels.find((l) => normalizeTr(l.name) === normalized) ??
    labels.find((l) => normalizeTr(l.name).startsWith(normalized))
  );
}

function findProperty(properties: PropertyDefinition[], rawName: string): PropertyDefinition | undefined {
  const normalized = normalizeTr(rawName);
  return (
    properties.find((p) => normalizeTr(p.name) === normalized) ??
    properties.find((p) => normalizeTr(p.name).startsWith(normalized))
  );
}

function parseDateRangeValue(raw: string): { from?: number; to?: number } | null {
  const [fromRaw, toRaw] = raw.split("..");
  const from = Date.parse(fromRaw);
  if (Number.isNaN(from)) return null;
  if (toRaw) {
    const to = Date.parse(toRaw);
    if (Number.isNaN(to)) return null;
    return { from, to: to + 24 * 60 * 60 * 1000 };
  }
  // Single date: matches that whole day.
  return { from, to: from + 24 * 60 * 60 * 1000 };
}

/** Çip başlıkları ("Label is Urgent"); arayüz dilinden gelir, verilmezse Türkçe. */
export interface ChipPrefixes {
  label: string;
  type: string;
  date: string;
  /** Çip metni kalıbı (`{field}` `{value}`); verilmezse "{field}: {value}". */
  format?: string;
}

const DEFAULT_PREFIXES: ChipPrefixes = { label: "Etiket", type: "Tür", date: "Tarih" };
const DEFAULT_CHIP_FORMAT = "{field}: {value}";

/** Çip metni: İngilizce "Label is Urgent", Türkçe "Etiket: Acil" (kalıp arayüz dilinden gelir). */
export function chipText(field: string, value: string, format: string = DEFAULT_CHIP_FORMAT): string {
  return format.replace(/\{(field|value)\}/g, (_, key: string) => (key === "field" ? field : value));
}

export interface InlineChipContext {
  labels: LabelItem[];
  properties: PropertyDefinition[];
  prefixes?: ChipPrefixes;
}

function parseToken(token: string, ctx: InlineChipContext): SearchChip | null {
  const prefixes = ctx.prefixes ?? DEFAULT_PREFIXES;
  const colonIdx = token.indexOf(":");
  if (colonIdx <= 0 || colonIdx === token.length - 1) return null;
  const rawKey = token.slice(0, colonIdx);
  const rawValue = token.slice(colonIdx + 1);
  const kind = KEY_ALIASES[normalizeTr(rawKey)];
  if (!kind) return null;

  switch (kind) {
    case "label": {
      const label = findLabel(ctx.labels, rawValue);
      if (!label) return null;
      return { id: createChipId(), kind: "label", labelId: label.id, displayLabel: chipText(prefixes.label, label.name, prefixes.format) };
    }
    case "type": {
      const value = rawValue.toLowerCase();
      const isFolderWord = ["klasor", "klasör", "folder"].includes(normalizeTr(value));
      const isFileWord = ["dosya", "file"].includes(normalizeTr(value));
      const fileType = isFolderWord ? "folder" : isFileWord ? "file" : value;
      return { id: createChipId(), kind: "type", fileType, displayLabel: chipText(prefixes.type, fileType, prefixes.format) };
    }
    case "dateRange": {
      const range = parseDateRangeValue(rawValue);
      if (!range) return null;
      return {
        id: createChipId(),
        kind: "dateRange",
        dateFrom: range.from,
        dateTo: range.to,
        displayLabel: chipText(prefixes.date, rawValue, prefixes.format),
      };
    }
    case "property": {
      const eqIdx = rawValue.indexOf("=");
      if (eqIdx <= 0) return null;
      const propName = rawValue.slice(0, eqIdx);
      const propValue = rawValue.slice(eqIdx + 1);
      const prop = findProperty(ctx.properties, propName);
      if (!prop || !propValue) return null;
      return {
        id: createChipId(),
        kind: "property",
        propertyId: prop.id,
        propertyValue: propValue,
        displayLabel: chipText(prop.name, propValue, prefixes.format),
      };
    }
    default:
      return null;
  }
}

export interface ParsedInlineQuery {
  text: string;
  chips: SearchChip[];
}

/** Extract resolvable `key:value` shorthand tokens from `rawText`, leaving the rest as free text. */
export function extractInlineChips(rawText: string, ctx: InlineChipContext): ParsedInlineQuery {
  const tokens = splitPreservingQuotes(rawText);
  const remaining: string[] = [];
  const chips: SearchChip[] = [];
  for (const token of tokens) {
    const chip = parseToken(token, ctx);
    if (chip) chips.push(chip);
    else remaining.push(token);
  }
  return { text: remaining.join(" "), chips };
}
