"use client";

import { CloseIcon, TagIcon, FileKindIcon, FolderIcon, CalendarIcon, FilterIcon, LinkIcon, UserIcon } from "@/components/icons";
import type { SearchChip, SearchChipKind } from "@/lib/search/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/i18n-context";

const CHIP_ICON: Record<SearchChipKind, typeof TagIcon> = {
  label: TagIcon,
  type: FileKindIcon,
  folder: FolderIcon,
  dateRange: CalendarIcon,
  property: FilterIcon,
  relatedFile: LinkIcon,
  owner: UserIcon,
};

interface FilterChipProps {
  chip: SearchChip;
  onRemove: (id: string) => void;
  className?: string;
}

/** Aktif filtre (spec §2.3): `Label is Client ✕`, secondary görünüm, --r-md, 28px. */
export function FilterChip({ chip, onRemove, className }: FilterChipProps) {
  const { t } = useI18n();
  const Icon = CHIP_ICON[chip.kind];
  return (
    <span
      className={cn(
        "inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border border-control bg-raised pl-2 pr-0.5 text-sm text-fg",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-fg-2" aria-hidden="true" />
      <span className="max-w-56 truncate">{chip.displayLabel}</span>
      <button
        type="button"
        onClick={() => onRemove(chip.id)}
        className="flex size-6 items-center justify-center rounded-sm text-fg-3 hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("dashboard.search.removeFilter").replace("{label}", chip.displayLabel)}
      >
        <CloseIcon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}
