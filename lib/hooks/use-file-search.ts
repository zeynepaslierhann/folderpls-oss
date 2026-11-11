"use client";

/**
 * React glue for search v2 (lib/search). Exposes the basic search surface
 * (`searchQuery`/`setSearchQuery`/`searchResults`/`isSearching`/
 * `isSearchMode`) used by the FileGridItem/FileItem result rendering in the
 * dashboard pages, plus the structured-query surface: filter chips,
 * ranked+highlighted results, suggestions, recent searches, and a ⌘K
 * palette toggle.
 *
 * Everything here operates on in-memory `DriveFile[]` / `TaggedItem[]` the
 * caller already has loaded — no Drive API calls happen in this file.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { isFolder } from "@/lib/google-drive/google-drive";
import type { DriveFile, FilterGroup, LabelItem, PropertyDefinition, TaggedItem } from "@/lib/types";
import { createSearchEngine, timedSearch } from "@/lib/search/engine";
import { extractInlineChips, type ChipPrefixes } from "@/lib/search/query-parser";
import { useI18n } from "@/lib/i18n/i18n-context";
import { normalizeTr } from "@/lib/search/normalize";
import { queryToFilterGroup } from "@/lib/search/saved-search";
import { loadRecentSearches, pushRecentSearch, clearRecentSearches as clearRecentSearchesStorage } from "@/lib/search/recent-searches";
import type { SearchChip, SearchQuery, SearchResultItem } from "@/lib/search/types";

export interface UseFileSearchParams {
  files: DriveFile[];
  /** itemMetadata: Record<fileId, TaggedItem> — same shape useLabeledItemsLoader already produces. */
  itemMetadata: Record<string, TaggedItem>;
  userLabels: LabelItem[];
  propertyDefinitions: PropertyDefinition[];
  /** Register the ⌘K / Ctrl+K shortcut to toggle the command palette. Defaults to true. */
  enableShortcut?: boolean;
}

export interface MatchedLabel {
  label: LabelItem;
  fileIds: string[];
}

export interface FileSearchState {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  chips: SearchChip[];
  addChip: (chip: SearchChip) => void;
  removeChip: (id: string) => void;
  clearChips: () => void;
  clearAll: () => void;

  /** Legacy-shaped result buckets — unchanged consumer contract for existing grid/list rendering. */
  searchResults: {
    folders: DriveFile[];
    files: DriveFile[];
    labels: MatchedLabel[];
  };
  /** Full ranked results with match/highlight metadata, for the command palette. */
  rankedResults: SearchResultItem[];

  isSearching: boolean;
  isSearchMode: boolean;

  suggestions: { labels: string[]; properties: string[] };
  recentSearches: string[];
  clearRecentSearches: () => void;
  /** Call when a search is "committed" (result opened, Enter pressed, palette closed) to save it to recents. */
  commitSearch: () => void;

  /** Serialize the current query to a legacy FilterGroup, for "save as collection". */
  toFilterGroup: () => FilterGroup;

  buildTimeMs: number;
  searchTimeMs: number;
  itemCount: number;

  isPaletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
}

const EMPTY_RESULTS = { folders: [] as DriveFile[], files: [] as DriveFile[], labels: [] as MatchedLabel[] };

export function useFileSearch({
  files,
  itemMetadata,
  userLabels,
  propertyDefinitions,
  enableShortcut = true,
}: UseFileSearchParams): FileSearchState {
  const [searchQuery, setSearchQueryState] = useState("");
  const [chips, setChips] = useState<SearchChip[]>([]);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches());

  // Çip başlıkları arayüz dilinde ("Label is Urgent"; eskiden hep "Etiket:").
  const { t } = useI18n();
  const prefixes: ChipPrefixes = useMemo(
    () => ({
      label: t("dashboard.search.filterLabel"),
      type: t("dashboard.search.filterType"),
      date: t("dashboard.search.filterDate"),
      format: t("dashboard.search.chipFormat"),
    }),
    [t]
  );

  // Auto-tokenize resolvable `key:value` shorthand into chips, but only once the
  // user has moved past that token (trailing space) — avoids converting a label
  // chip mid-keystroke off a partial name match.
  useEffect(() => {
    const endsWithSpace = /\s$/.test(searchQuery);
    const inProgress = endsWithSpace ? "" : (searchQuery.match(/(\S+)$/)?.[0] ?? "");
    const settled = endsWithSpace ? searchQuery : searchQuery.slice(0, searchQuery.length - inProgress.length);
    if (!settled.trim()) return;
    const { text, chips: extracted } = extractInlineChips(settled, { labels: userLabels, properties: propertyDefinitions, prefixes });
    if (extracted.length === 0) return;
    setChips((prev) => [...prev, ...extracted]);
    setSearchQueryState(`${text ? `${text} ` : ""}${inProgress}`);
  }, [searchQuery, userLabels, propertyDefinitions, prefixes]);

  // Yazılmakta olan `label:Urg` parçası çipe dönmeden de sonuçlara uygulanır:
  // palet "label:Urgent" yazılırken "No matches" demez, eşleşen dosyaları
  // gösterir. Yalnız arama sorgusunu etkiler; çip boşluktan sonra oluşur.
  const pendingChips = useMemo(() => {
    const inProgress = /\s$/.test(searchQuery) ? "" : (searchQuery.match(/(\S+)$/)?.[0] ?? "");
    if (!inProgress.includes(":")) return null;
    const { chips: extracted } = extractInlineChips(inProgress, { labels: userLabels, properties: propertyDefinitions, prefixes });
    return extracted.length > 0 ? { text: searchQuery.slice(0, searchQuery.length - inProgress.length), chips: extracted } : null;
  }, [searchQuery, userLabels, propertyDefinitions, prefixes]);

  const engine = useMemo(
    () => createSearchEngine({ files, taggedItems: Object.values(itemMetadata), labels: userLabels, properties: propertyDefinitions }),
    [files, itemMetadata, userLabels, propertyDefinitions]
  );

  const query: SearchQuery = useMemo(
    () => (pendingChips ? { text: pendingChips.text, chips: [...chips, ...pendingChips.chips] } : { text: searchQuery, chips }),
    [searchQuery, chips, pendingChips]
  );
  const isSearchMode = searchQuery.trim().length > 0 || chips.length > 0;

  // Bundle results + elapsed time into one memoized value (rather than a ref
  // write) so the timing measurement stays a pure render output.
  const searchOutcome = useMemo(() => {
    if (!isSearchMode) return { results: [] as SearchResultItem[], elapsedMs: 0 };
    return timedSearch(engine, query, { limit: 300 });
  }, [engine, query, isSearchMode]);
  const rankedResults = searchOutcome.results;

  const searchResults = useMemo(() => {
    if (!isSearchMode) return EMPTY_RESULTS;
    const folders: DriveFile[] = [];
    const resultFiles: DriveFile[] = [];
    for (const r of rankedResults) {
      if (isFolder(r.file)) folders.push(r.file);
      else resultFiles.push(r.file);
    }

    const text = query.text.trim();
    const labels: MatchedLabel[] = [];
    if (text) {
      const normalized = normalizeTr(text);
      for (const label of userLabels) {
        if (!normalizeTr(label.name).includes(normalized)) continue;
        const fileIds = files.filter((f) => (itemMetadata[f.id]?.labels ?? []).includes(label.id)).map((f) => f.id);
        if (fileIds.length > 0) labels.push({ label, fileIds });
      }
    }

    return { folders, files: resultFiles, labels };
  }, [rankedResults, isSearchMode, query.text, userLabels, files, itemMetadata]);

  const suggestions = useMemo(() => {
    const lastToken = searchQuery.trim().split(/\s+/).pop() ?? "";
    if (!lastToken) return { labels: [], properties: [] };
    return {
      labels: engine.suggestLabelNames(lastToken),
      properties: engine.suggestPropertyNames(lastToken),
    };
  }, [engine, searchQuery]);

  const setSearchQuery = useCallback((q: string) => setSearchQueryState(q), []);

  const addChip = useCallback((chip: SearchChip) => {
    setChips((prev) => (prev.some((c) => c.kind === chip.kind && c.displayLabel === chip.displayLabel) ? prev : [...prev, chip]));
  }, []);
  const removeChip = useCallback((id: string) => setChips((prev) => prev.filter((c) => c.id !== id)), []);
  const clearChips = useCallback(() => setChips([]), []);
  const clearAll = useCallback(() => {
    setSearchQueryState("");
    setChips([]);
  }, []);

  const commitSearch = useCallback(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setRecentSearches(pushRecentSearch(trimmed));
  }, [searchQuery]);

  const clearRecentSearches = useCallback(() => {
    clearRecentSearchesStorage();
    setRecentSearches([]);
  }, []);

  const toFilterGroup = useCallback(() => queryToFilterGroup(query, propertyDefinitions), [query, propertyDefinitions]);

  const openPalette = useCallback(() => setIsPaletteOpen(true), []);
  const closePalette = useCallback(() => setIsPaletteOpen(false), []);
  const togglePalette = useCallback(() => setIsPaletteOpen((v) => !v), []);

  useEffect(() => {
    if (!enableShortcut) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enableShortcut]);

  return {
    searchQuery,
    setSearchQuery,
    chips,
    addChip,
    removeChip,
    clearChips,
    clearAll,
    searchResults,
    rankedResults,
    isSearching: false,
    isSearchMode,
    suggestions,
    recentSearches,
    clearRecentSearches,
    commitSearch,
    toFilterGroup,
    buildTimeMs: engine.buildTimeMs,
    searchTimeMs: searchOutcome.elapsedMs,
    itemCount: engine.itemCount,
    isPaletteOpen,
    openPalette,
    closePalette,
    togglePalette,
  };
}
