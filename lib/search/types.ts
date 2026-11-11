/**
 * Search v2 — type definitions.
 *
 * The engine is deliberately DataScope-agnostic: it only ever sees
 * DriveFile[] + TaggedItem[] + label/property definitions that the caller
 * already has in memory. Personal vs. org scope only changes *which* data
 * the caller passes in (and the localStorage namespace used for recent
 * searches) — no branching happens inside the engine itself.
 */

import type { DriveFile, LabelItem, PropertyDefinition, TaggedItem } from "@/lib/types";

/** Structured filter chip kinds. `owner` is reserved for the org model
 * (added-by / owned-by); it is only surfaced in the UI once a caller
 * supplies a `resolveOwner` function, since DriveFile has no owner field
 * today. */
export type SearchChipKind =
  | "label"
  | "type"
  | "folder"
  | "dateRange"
  | "property"
  | "relatedFile"
  | "owner";

export interface SearchChip {
  id: string;
  kind: SearchChipKind;
  /** Human-readable summary shown on the chip, e.g. `Etiket: Fatura`. */
  displayLabel: string;

  // kind === "label"
  labelId?: string;

  // kind === "type"
  /** Either "folder"/"file" or a lowercase file extension like "pdf". */
  fileType?: string;

  // kind === "folder"
  folderId?: string;

  // kind === "dateRange"
  dateFrom?: number; // epoch ms, inclusive
  dateTo?: number; // epoch ms, exclusive

  // kind === "property"
  propertyId?: string;
  propertyValue?: string | number | boolean;

  // kind === "relatedFile"
  relatedFileId?: string;

  // kind === "owner"
  ownerId?: string;
}

export interface SearchQuery {
  /** Free-text portion, already stripped of any inline `key:value` tokens. */
  text: string;
  chips: SearchChip[];
}

export function emptySearchQuery(): SearchQuery {
  return { text: "", chips: [] };
}

export function isQueryEmpty(query: SearchQuery): boolean {
  return query.text.trim().length === 0 && query.chips.length === 0;
}

export type SearchMatchField = "name" | "label" | "property" | "note";
export type SearchMatchType = "exact" | "prefix" | "substring" | "fuzzy";

export interface SearchMatch {
  field: SearchMatchField;
  matchType: SearchMatchType;
  term: string;
  /** Ranges (in the original, displayed string) to highlight. Only populated for `field === "name"`. */
  ranges?: [number, number][];
  /** labelId or propertyId when field is "label" / "property". */
  targetId?: string;
  /** The matched display text, e.g. the label name or property value shown to the user. */
  targetText?: string;
}

export interface SearchResultItem {
  file: DriveFile;
  taggedItem?: TaggedItem;
  score: number;
  matches: SearchMatch[];
}

export interface SearchEngineInput {
  files: DriveFile[];
  taggedItems: TaggedItem[];
  labels: LabelItem[];
  properties: PropertyDefinition[];
}

export interface SearchOptions {
  limit?: number;
}

export interface SearchEngine {
  readonly itemCount: number;
  readonly buildTimeMs: number;
  search(query: SearchQuery, options?: SearchOptions): SearchResultItem[];
  /** Label display names starting with `prefix` (normalized match), for autocomplete. */
  suggestLabelNames(prefix: string, limit?: number): string[];
  /** Property definition names starting with `prefix`, for autocomplete. */
  suggestPropertyNames(prefix: string, limit?: number): string[];
}
