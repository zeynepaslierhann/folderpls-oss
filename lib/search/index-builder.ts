/**
 * Builds the in-memory inverted index the engine searches over.
 *
 * Index shape, per field ("name" | "label" | "property" | "note"):
 *  - postings: token -> item indices that contain it (exact match, O(1))
 *  - sortedTokens: same tokens, lexicographically sorted, so prefix lookups
 *    are a binary search + linear walk over a contiguous slice instead of a
 *    full scan.
 *  - byFirstChar: tokens bucketed by first character, so fuzzy matching only
 *    has to Levenshtein-compare against a small bucket instead of every
 *    token in the field.
 */

import type { DriveFile, LabelItem, PropertyDefinition, TaggedItem } from "@/lib/types";
import { isFolder } from "@/lib/google-drive/google-drive";
import { normalizeTr, tokenizeWithPositions, type PositionedToken } from "./normalize";
import type { SearchEngineInput } from "./types";

export interface IndexedProperty {
  id: string;
  name: string;
  /** Human-readable value, e.g. a select option's display name rather than its id. */
  valueText: string;
  normalized: string;
}

export interface IndexedItem {
  index: number;
  id: string;
  file: DriveFile;
  taggedItem?: TaggedItem;
  isFolder: boolean;
  extension: string | null;
  nameNormalized: string;
  nameTokens: PositionedToken[];
  labelIds: string[];
  labelNames: { id: string; name: string; normalized: string }[];
  properties: IndexedProperty[];
  noteText: string;
  parentIds: string[];
  modifiedTimeMs: number | null;
}

export interface FieldIndex {
  postings: Map<string, number[]>;
  sortedTokens: string[];
  byFirstChar: Map<string, string[]>;
}

export interface SearchIndex {
  items: IndexedItem[];
  fields: {
    name: FieldIndex;
    label: FieldIndex;
    property: FieldIndex;
    note: FieldIndex;
  };
  labelNames: string[]; // unique, original casing, for suggestions
  propertyNames: string[]; // unique, original casing, for suggestions
}

function getExtension(file: DriveFile): string | null {
  if (isFolder(file)) return null;
  const dot = file.name.lastIndexOf(".");
  if (dot <= 0 || dot === file.name.length - 1) return null;
  return file.name.slice(dot + 1).toLowerCase();
}

function propertyValueText(prop: PropertyDefinition, raw: string | number | boolean | string[] | undefined): string {
  if (raw === undefined || raw === null || raw === "") return "";
  switch (prop.type) {
    case "select":
    case "status": {
      const id = String(raw);
      const opt = prop.options?.find((o) => o.id === id);
      return opt?.name ?? id;
    }
    case "multi-select": {
      const ids = Array.isArray(raw) ? raw : [String(raw)];
      return ids.map((id) => prop.options?.find((o) => o.id === id)?.name ?? id).join(" ");
    }
    case "checkbox":
      return raw ? "evet yes true" : "hayır no false";
    case "date":
    case "number":
    case "text":
    default:
      return String(raw);
  }
}

class FieldIndexBuilder {
  private postings = new Map<string, Set<number>>();

  add(token: string, itemIndex: number): void {
    if (!token) return;
    let set = this.postings.get(token);
    if (!set) {
      set = new Set();
      this.postings.set(token, set);
    }
    set.add(itemIndex);
  }

  build(): FieldIndex {
    const sortedTokens = Array.from(this.postings.keys()).sort();
    const byFirstChar = new Map<string, string[]>();
    const postings = new Map<string, number[]>();
    for (const token of sortedTokens) {
      postings.set(token, Array.from(this.postings.get(token) ?? []));
      const firstChar = token[0] ?? "";
      const bucket = byFirstChar.get(firstChar);
      if (bucket) bucket.push(token);
      else byFirstChar.set(firstChar, [token]);
    }
    return { postings, sortedTokens, byFirstChar };
  }
}

export function buildSearchIndex(input: SearchEngineInput): SearchIndex {
  const { files, taggedItems, labels, properties } = input;

  const taggedById = new Map<string, TaggedItem>();
  for (const t of taggedItems) taggedById.set(t.itemId, t);

  const labelById = new Map<string, LabelItem>();
  for (const l of labels) labelById.set(l.id, l);

  const propertyById = new Map<string, PropertyDefinition>();
  for (const p of properties) propertyById.set(p.id, p);

  const nameBuilder = new FieldIndexBuilder();
  const labelBuilder = new FieldIndexBuilder();
  const propertyBuilder = new FieldIndexBuilder();
  const noteBuilder = new FieldIndexBuilder();

  const items: IndexedItem[] = [];
  const labelNameSet = new Set<string>();
  const propertyNameSet = new Set<string>();

  files.forEach((file, index) => {
    const taggedItem = taggedById.get(file.id);
    const nameNormalized = normalizeTr(file.name);
    const nameTokens = tokenizeWithPositions(nameNormalized);
    for (const tok of nameTokens) nameBuilder.add(tok.text, index);

    const labelIds = taggedItem?.labels ?? [];
    const labelNames = labelIds
      .map((id) => labelById.get(id))
      .filter((l): l is LabelItem => Boolean(l))
      .map((l) => ({ id: l.id, name: l.name, normalized: normalizeTr(l.name) }));
    for (const ln of labelNames) {
      labelNameSet.add(ln.name);
      for (const tok of tokenizeWithPositions(ln.normalized)) labelBuilder.add(tok.text, index);
    }

    const propEntries: IndexedProperty[] = [];
    const rawProps = taggedItem?.properties ?? {};
    for (const [propId, rawValue] of Object.entries(rawProps)) {
      const def = propertyById.get(propId);
      if (!def) continue;
      const valueText = propertyValueText(def, rawValue);
      if (!valueText) continue;
      propertyNameSet.add(def.name);
      const normalized = normalizeTr(valueText);
      propEntries.push({ id: propId, name: def.name, valueText, normalized });
      for (const tok of tokenizeWithPositions(normalized)) propertyBuilder.add(tok.text, index);
    }

    const noteBlocks = taggedItem?.notes ?? [];
    const noteTextRaw = noteBlocks.map((b) => b.content).join(" ");
    const noteNormalized = normalizeTr(noteTextRaw);
    for (const tok of tokenizeWithPositions(noteNormalized)) noteBuilder.add(tok.text, index);

    items.push({
      index,
      id: file.id,
      file,
      taggedItem,
      isFolder: isFolder(file),
      extension: getExtension(file),
      nameNormalized,
      nameTokens,
      labelIds,
      labelNames,
      properties: propEntries,
      noteText: noteNormalized,
      parentIds: file.parents ?? [],
      modifiedTimeMs: file.modifiedTime ? Date.parse(file.modifiedTime) : null,
    });
  });

  return {
    items,
    fields: {
      name: nameBuilder.build(),
      label: labelBuilder.build(),
      property: propertyBuilder.build(),
      note: noteBuilder.build(),
    },
    labelNames: Array.from(labelNameSet).sort((a, b) => a.localeCompare(b, "tr")),
    propertyNames: Array.from(propertyNameSet).sort((a, b) => a.localeCompare(b, "tr")),
  };
}

/** Binary search + linear walk: all tokens in `sortedTokens` starting with `prefix`. */
export function prefixTokens(sortedTokens: string[], prefix: string): string[] {
  if (!prefix) return [];
  let lo = 0;
  let hi = sortedTokens.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedTokens[mid] < prefix) lo = mid + 1;
    else hi = mid;
  }
  const result: string[] = [];
  for (let i = lo; i < sortedTokens.length; i++) {
    if (sortedTokens[i].startsWith(prefix)) result.push(sortedTokens[i]);
    else break;
  }
  return result;
}

/** Linear scan for tokens that contain `term` anywhere (mid-word substring matches). */
export function substringTokens(sortedTokens: string[], term: string): string[] {
  const result: string[] = [];
  for (const token of sortedTokens) {
    if (token.length > term.length && token.includes(term)) result.push(token);
  }
  return result;
}
