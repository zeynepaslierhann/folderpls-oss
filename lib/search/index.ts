/**
 * Search v2 — barrel export.
 *
 * Usage: import { createSearchEngine, normalizeTr } from "@/lib/search";
 *
 * Note: this module is unrelated to the legacy `lib/search/search-utils.ts`
 * (SmartCollection's `applyFilters`), which is left untouched — see
 * `saved-search.ts` for the compatibility bridge between the two.
 */

export { createSearchEngine, timedSearch } from "./engine";
export { mergeFileSources } from "./merge-sources";
export { normalizeTr, tokenize, tokenizeWithPositions } from "./normalize";
export { boundedLevenshtein, isFuzzyMatch, maxDistanceForTerm } from "./fuzzy";
export { buildSearchIndex } from "./index-builder";
export type { IndexedItem, SearchIndex, FieldIndex } from "./index-builder";
export { chipMatches, itemMatchesAllChips } from "./filters";
export { rangesForNameMatch, mergeRanges, segmentText } from "./highlight";
export type { TextSegment } from "./highlight";
export { extractInlineChips, createChipId } from "./query-parser";
export type { ParsedInlineQuery } from "./query-parser";
export { loadRecentSearches, pushRecentSearch, clearRecentSearches } from "./recent-searches";
export { queryToFilterGroup } from "./saved-search";
export type {
  SearchChip,
  SearchChipKind,
  SearchQuery,
  SearchEngine,
  SearchEngineInput,
  SearchOptions,
  SearchMatch,
  SearchMatchField,
  SearchMatchType,
  SearchResultItem,
} from "./types";
export { emptySearchQuery, isQueryEmpty } from "./types";
