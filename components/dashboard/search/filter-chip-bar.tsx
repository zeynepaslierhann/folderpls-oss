"use client";

import { BookmarkIcon, SearchIcon, CloseIcon } from "@/components/icons";
import { FilterChip } from "./filter-chip";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { SearchChip } from "@/lib/search/types";

interface FilterChipBarProps {
  chips: SearchChip[];
  /** Serbest metin araması da aktif bir filtre gibi gösterilir. */
  query?: string;
  onClearQuery?: () => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  /** Aktif filtreyi kayıtlı görünüm (smart collection) olarak sakla. */
  onSaveView?: () => void;
  /** Bandın sağındaki kısa bilgi (örn. "Searching loaded files only"); ayrı bir satır açılmaz. */
  info?: string;
}

/**
 * Filtre bandı (spec §2.3): 40px, YALNIZ en az bir filtre aktifken görünür.
 * Çipler + "Clear" + sağda bilgi notu ve "Save view". Filtre eklemek üst çubuktaki
 * "Filter" menüsünden yapılır.
 */
export function FilterChipBar({ chips, query, onClearQuery, onRemove, onClearAll, onSaveView, info }: FilterChipBarProps) {
  const { t } = useI18n();
  if (chips.length === 0 && !query) return null;
  return (
    <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-1.5 border-b border-line px-4 py-1.5">
      {query && (
        <span className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border border-control bg-raised pl-2 pr-0.5 text-sm text-fg">
          <SearchIcon className="h-3.5 w-3.5 shrink-0 text-fg-2" aria-hidden="true" />
          <span className="max-w-56 truncate">“{query}”</span>
          {onClearQuery && (
            <button
              type="button"
              onClick={onClearQuery}
              className="flex size-6 items-center justify-center rounded-sm text-fg-3 hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t("dashboard.panel.clearSearch")}
            >
              <CloseIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </span>
      )}
      {chips.map((chip) => (
        <FilterChip key={chip.id} chip={chip} onRemove={onRemove} />
      ))}
      <Button variant="ghost" size="sm" onClick={onClearAll}>
        {t("dashboard.panel.clear")}
      </Button>
      <span className="ml-auto" />
      {info && <span className="text-sm text-fg-3">{info}</span>}
      {onSaveView && (
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onSaveView}>
          <BookmarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {t("dashboard.panel.saveView")}
        </Button>
      )}
    </div>
  );
}
