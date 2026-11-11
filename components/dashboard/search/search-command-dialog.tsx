"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon, ClockIcon, TagIcon, FilterIcon, CloseIcon } from "@/components/icons";
import { FileTypeIcon } from "@/components/dashboard/file-item/file-type";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/i18n-context";
import { HighlightedText } from "./highlighted-text";
import { FilterChip } from "./filter-chip";
import type { SearchChip, SearchResultItem } from "@/lib/search/types";
import type { DriveFile } from "@/lib/types";

interface SearchCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  chips: SearchChip[];
  onRemoveChip: (id: string) => void;
  rankedResults: SearchResultItem[];
  recentSearches: string[];
  onClearRecentSearches: () => void;
  suggestions: { labels: string[]; properties: string[] };
  onCommit: () => void;
  onSelectFile: (file: DriveFile) => void;
}

/**
 * İpucu metni: `label:Invoice`, `date:2024-01-01..2024-02-01` gibi sözdizimi
 * parçaları tek parça kalır (dar ekranda tarihin ortasından bölünmez).
 */
function SearchTip({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\S+:\S+)/).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="whitespace-nowrap font-medium text-fg-2">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

type PaletteEntry = { type: "recent"; value: string } | { type: "result"; item: SearchResultItem };

const MATCH_FIELD_KEY: Record<string, string> = {
  name: "dashboard.search.matchedInName",
  label: "dashboard.search.matchedInLabel",
  property: "dashboard.search.matchedInProperty",
  note: "dashboard.search.matchedInNote",
};

export function SearchCommandDialog({
  open,
  onOpenChange,
  searchQuery,
  setSearchQuery,
  chips,
  onRemoveChip,
  rankedResults,
  recentSearches,
  onClearRecentSearches,
  suggestions,
  onCommit,
  onSelectFile,
}: SearchCommandDialogProps) {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // Palet kapanınca sayfa arama modunda kalmaz (spec §3 Search): yalnız
  // "Show all results" ile açıkça listeye taşınan arama korunur.
  const keepQueryRef = useRef(false);
  const handleOpenChange = (next: boolean) => {
    if (next) keepQueryRef.current = false;
    else if (!keepQueryRef.current) setSearchQuery("");
    onOpenChange(next);
  };
  const showAllInList = () => {
    keepQueryRef.current = true;
    onCommit();
    onOpenChange(false);
  };
  const listboxId = "search-palette-listbox";

  const hasQuery = searchQuery.trim().length > 0 || chips.length > 0;

  const entries: PaletteEntry[] = useMemo(() => {
    if (!hasQuery) return recentSearches.map((value) => ({ type: "recent" as const, value }));
    return rankedResults.map((item) => ({ type: "result" as const, item }));
  }, [hasQuery, recentSearches, rankedResults]);

  // Clamp at read time instead of resetting via an effect (avoids a
  // setState-during-effect cascade) — every state change that can shrink
  // `entries` (typing, removing a chip, picking a recent search) happens
  // through our own event handlers below, which reset activeIndex directly.
  const safeActiveIndex = entries.length === 0 ? 0 : Math.min(activeIndex, entries.length - 1);

  useEffect(() => {
    if (open) {
      // Radix focuses DialogContent itself by default; move focus to the input.
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  const selectEntry = (entry: PaletteEntry | undefined) => {
    if (!entry) return;
    if (entry.type === "recent") {
      setSearchQuery(entry.value);
      setActiveIndex(0);
      return;
    }
    onSelectFile(entry.item.file);
    onCommit();
    handleOpenChange(false);
  };

  const handleQueryChange = (value: string) => {
    setSearchQuery(value);
    setActiveIndex(0);
  };

  const handleRemoveChip = (id: string) => {
    onRemoveChip(id);
    setActiveIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(entries.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (entries.length > 0) selectEntry(entries[safeActiveIndex]);
      else onCommit();
    } else if (e.key === "Escape") {
      handleOpenChange(false);
    }
  };

  const activeOptionId = entries.length > 0 ? `search-palette-option-${safeActiveIndex}` : undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showClose={false}
        className="top-[12%] max-w-2xl translate-y-0 gap-0 overflow-hidden p-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">{t("dashboard.search.openPalette")}</DialogTitle>
        <DialogDescription className="sr-only">{t("dashboard.search.palettePlaceholder")}</DialogDescription>

        <div className="flex h-12 items-center gap-2 border-b border-line px-4">
          <SearchIcon className="h-4 w-4 shrink-0 text-fg-3" aria-hidden="true" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={entries.length > 0}
            aria-controls={listboxId}
            aria-activedescendant={activeOptionId}
            aria-autocomplete="list"
            aria-label={t("dashboard.search.openPalette")}
            value={searchQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("dashboard.search.palettePlaceholder")}
            className="flex-1 bg-transparent text-base outline-none placeholder:text-fg-3"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => handleQueryChange("")}
              className="flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg"
              aria-label={t("dashboard.panel.clearSearch")}
            >
              <CloseIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg"
              aria-label={t("common.close")}
            >
              <CloseIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2">
            {chips.map((chip) => (
              <FilterChip key={chip.id} chip={chip} onRemove={handleRemoveChip} />
            ))}
          </div>
        )}

        {hasQuery && (suggestions.labels.length > 0 || suggestions.properties.length > 0) && (
          <div className="flex flex-wrap gap-1 border-b border-line px-4 py-1.5">
            {[...suggestions.labels, ...suggestions.properties].slice(0, 6).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handleQueryChange(`${searchQuery.trim()} ${name}`.trim())}
                className="h-6 rounded-sm border border-line px-2 text-xs text-fg-2 transition-colors duration-[var(--dur-fast)] hover:border-control hover:text-fg"
              >
                {name}
              </button>
            ))}
          </div>
        )}

        <div id={listboxId} role="listbox" aria-label={t("dashboard.search.palettePlaceholder")} className="max-h-[60vh] overflow-y-auto py-1">
          {!hasQuery && entries.length > 0 && (
            <div className="flex items-center justify-between px-4 pb-1 pt-2">
              <span className="text-xs font-medium text-fg-3">
                {t("dashboard.search.recentSearches")}
              </span>
              <button type="button" onClick={onClearRecentSearches} className="text-xs text-fg-3 underline hover:text-fg">
                {t("dashboard.search.clearRecent")}
              </button>
            </div>
          )}

          {entries.length === 0 && hasQuery && (
            <div className="px-4 py-8 text-center">
              <p className="text-base font-medium text-fg">
                {searchQuery.trim()
                  ? t("dashboard.search.noResultsHint").replace("{query}", searchQuery.trim())
                  : t("dashboard.panel.noMatchesTitle")}
              </p>
              {/* Sayfadaki boş durumla aynı cümle: tek "eşleşme yok" dili. */}
              <p className="mt-1 text-sm text-fg-2">
                {chips.length > 0 ? t("dashboard.panel.noMatchesBody") : t("dashboard.search.noMatchesTermBody")}
              </p>
            </div>
          )}

          {entries.length === 0 && !hasQuery && (
            <p className="px-4 py-8 text-center text-sm text-pretty text-fg-2">
              <SearchTip text={t("dashboard.search.paletteHint")} />
            </p>
          )}

          {entries.map((entry, index) => {
            const optionId = `search-palette-option-${index}`;
            const isActive = index === safeActiveIndex;
            if (entry.type === "recent") {
              return (
                <button
                  key={optionId}
                  id={optionId}
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectEntry(entry)}
                  className={`flex h-9 w-full items-center gap-2.5 px-4 text-left text-base ${isActive ? "bg-hover" : ""}`}
                >
                  <ClockIcon className="h-4 w-4 shrink-0 text-fg-3" aria-hidden="true" />
                  <span className="truncate">{entry.value}</span>
                </button>
              );
            }

            const { file, matches } = entry.item;
            const nameMatch = matches.find((m) => m.field === "name");
            const otherMatch = matches.find((m) => m.field !== "name");

            return (
              <button
                key={optionId}
                id={optionId}
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectEntry(entry)}
                className={`flex h-9 w-full items-center gap-2.5 px-4 text-left text-base ${isActive ? "bg-hover" : ""}`}
              >
                <FileTypeIcon file={file} />
                <span className="truncate flex-1">
                  <HighlightedText text={file.name} ranges={nameMatch?.ranges} />
                </span>
                {otherMatch && (
                  <span className="flex h-5 shrink-0 items-center gap-1 rounded-sm border border-line px-1.5 text-xs text-fg-2">
                    {otherMatch.field === "label" ? <TagIcon className="h-3 w-3" aria-hidden="true" /> : <FilterIcon className="h-3 w-3" aria-hidden="true" />}
                    {otherMatch.targetText ?? t(MATCH_FIELD_KEY[otherMatch.field] ?? "dashboard.search.matchedInName")}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Alt bant yalnız söyleyecek bir şey varken: boş palette (ipucu zaten
            ortada) boş bir şerit kalmaz. Metin kesilmez, dar ekranda sarar. */}
        {(hasQuery || entries.length > 0) && (
          <div className="flex min-h-10 items-center justify-between gap-3 border-t border-line px-4 py-1.5 text-sm text-fg-3">
            <span className="min-w-0 text-pretty">
              {hasQuery ? t("dashboard.panel.searchingLoadedOnly") : <SearchTip text={t("dashboard.search.paletteHint")} />}
            </span>
            {hasQuery && rankedResults.length > 0 && (
              <button
                type="button"
                onClick={showAllInList}
                className="shrink-0 rounded-md px-2 py-1 font-medium text-fg hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("dashboard.panel.showAllResults")} ({rankedResults.length})
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
