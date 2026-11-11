"use client";

import { Fragment, type ReactNode } from "react";
import { ChevronDownIcon, ChevronRightIcon, DownloadIcon, NewFolderIcon, GridViewIcon, ListIcon, FilterIcon, DetailsPanelIcon, AddIcon, SearchIcon, TagIcon, DeleteIcon, UploadIcon, CloseIcon, PasteIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShellNavButton } from "@/components/dashboard/dashboard-shell/shell-context";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { SortKey, SortState } from "@/lib/ui/sort-files";

/* ─── Üst çubuk (spec §2.2) ──────────────────────────────────────────────── */

interface SelectionActions {
  count: number;
  onClear: () => void;
  onLabel?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
}

interface DriveTopBarProps {
  /** Sol: breadcrumb ya da sayfa başlığı (h1). */
  title: ReactNode;
  /** Sağ: en fazla üç kontrol — Filter, View, New. */
  actions?: ReactNode;
  /** En az bir öğe seçiliyken üst çubuğun içeriği yerinde seçim moduna döner. */
  selection?: SelectionActions | null;
}

export function DriveTopBar({ title, actions, selection }: DriveTopBarProps) {
  const { t } = useI18n();
  const selecting = !!selection && selection.count > 0;
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-4">
      <ShellNavButton />
      {selecting ? (
        <>
          <Button
            variant="ghost"
            size="icon-md"
            className="-ml-2"
            onClick={selection.onClear}
            aria-label={t("dashboard.panel.clearSelection")}
          >
            <CloseIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
          <p className="min-w-0 flex-1 truncate text-base font-medium tabular-nums" aria-live="polite">
            {t("dashboard.panel.selectedCount").replace("{count}", String(selection.count))}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {selection.onLabel && (
              <Button variant="ghost" size="md" className="gap-2 px-2.5" onClick={selection.onLabel}>
                <TagIcon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t("common.label")}</span>
                <span className="sr-only sm:hidden">{t("common.label")}</span>
              </Button>
            )}
            {selection.onDownload && (
              <Button variant="ghost" size="md" className="gap-2 px-2.5" onClick={selection.onDownload}>
                <DownloadIcon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t("common.download")}</span>
                <span className="sr-only sm:hidden">{t("common.download")}</span>
              </Button>
            )}
            {selection.onDelete && (
              <Button variant="ghost" size="md" className="gap-2 px-2.5 text-danger hover:text-danger" onClick={selection.onDelete}>
                <DeleteIcon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t("common.delete")}</span>
                <span className="sr-only sm:hidden">{t("common.delete")}</span>
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex min-w-0 flex-1 items-center">{title}</div>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </>
      )}
    </header>
  );
}

/**
 * Sayfa başlıklı ekranlar (Tagged, Graph, Trash, ayarlar): tek h1. Breadcrumb'ın
 * son segmentiyle AYNI boyut (16px/600) ve aynı sol kenar — ekranlar arası
 * geçişte başlık zıplamaz.
 */
export function PageTitle({ children, trailing }: { children: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <h1 className="truncate text-lg font-semibold">{children}</h1>
      {trailing}
    </div>
  );
}

export interface BreadcrumbSegment {
  key: string;
  label: string;
  onClick?: () => void;
}

/**
 * Breadcrumb: son segment h1 (text-lg 600, satır adından büyük), öncekiler
 * text-sm --fg-2. Dar ekranda yalnız son segment görünür; uzun yollarda
 * ortası "…" olur.
 */
export function DriveBreadcrumb({ segments }: { segments: BreadcrumbSegment[] }) {
  const last = segments[segments.length - 1];
  const before = segments.slice(0, -1);
  const shown = before.length > 2 ? [before[0], null, before[before.length - 1]] : before;
  return (
    // -ml-1: segmentlerin hover dolgusu (px-1) taşar, METİN PageTitle ile aynı kenarda başlar.
    <nav aria-label="Breadcrumb" className="-ml-1 flex min-w-0 items-center gap-1">
      {shown.map((seg, i) => (
        <Fragment key={seg?.key ?? `gap-${i}`}>
          {seg ? (
            <button
              type="button"
              onClick={seg.onClick}
              className="hidden max-w-40 shrink-0 truncate rounded-md px-1 py-0.5 text-sm text-fg-2 hover:bg-hover hover:text-fg sm:block"
            >
              {seg.label}
            </button>
          ) : (
            <span className="hidden px-1 text-sm text-fg-3 sm:inline" aria-hidden="true">
              …
            </span>
          )}
          <ChevronRightIcon className="hidden h-3.5 w-3.5 shrink-0 text-fg-3 sm:block" aria-hidden="true" />
        </Fragment>
      ))}
      {last && <h1 className="min-w-0 truncate px-1 text-lg font-semibold">{last.label}</h1>}
    </nav>
  );
}

/* ─── Sağ kontroller ─────────────────────────────────────────────────────── */

/** Filter (ghost): filtre menüsünü açan tetikleyici; AddFilterMenu'ye `trigger` olarak verilir. */
export function FilterTrigger({ count = 0, ...props }: { count?: number } & React.ComponentProps<typeof Button>) {
  const { t } = useI18n();
  return (
    <Button variant="ghost" size="md" className="gap-2 px-2.5 max-sm:size-10 max-sm:px-0" {...props}>
      <FilterIcon className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">{t("dashboard.panel.filter")}</span>
      <span className="sr-only sm:hidden">{t("dashboard.panel.filter")}</span>
      {count > 0 && <span className="text-sm text-fg-3 tabular-nums max-sm:hidden">{count}</span>}
    </Button>
  );
}

interface ViewMenuProps {
  displayMode: "list" | "grid";
  onDisplayModeChange: (mode: "list" | "grid") => void;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  detailsOpen?: boolean;
  onDetailsOpenChange?: (open: boolean) => void;
}

/**
 * View ▾ (ghost): Layout (List/Grid), Sort by, Details panel. Ayrı liste/ızgara
 * ikon çifti kaldırıldı; seçim menuitemradio olarak duyurulur.
 */
export function ViewMenu({ displayMode, onDisplayModeChange, sort, onSortChange, detailsOpen, onDetailsOpenChange }: ViewMenuProps) {
  const { t } = useI18n();
  const sortLabels: Record<SortKey, string> = {
    name: t("dashboard.panel.colName"),
    modified: t("dashboard.panel.colModified"),
    size: t("dashboard.panel.colSize"),
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="md" className="gap-1.5 px-2.5 max-sm:size-10 max-sm:px-0">
          {displayMode === "grid" ? <GridViewIcon className="h-4 w-4" aria-hidden="true" /> : <ListIcon className="h-4 w-4" aria-hidden="true" />}
          <span className="hidden sm:inline">{t("dashboard.panel.view")}</span>
          <span className="sr-only sm:hidden">{t("dashboard.panel.view")}</span>
          <ChevronDownIcon className="hidden h-3.5 w-3.5 text-fg-3 sm:block" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{t("dashboard.panel.layout")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={displayMode} onValueChange={(v) => onDisplayModeChange(v as "list" | "grid")}>
          <DropdownMenuRadioItem value="list">{t("dashboard.panel.layoutList")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="grid">{t("dashboard.panel.layoutGrid")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        {onSortChange && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("dashboard.panel.sortBy")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sort?.key ?? "default"}
              onValueChange={(v) => onSortChange(v === "default" ? null : { key: v as SortKey, dir: v === "name" ? "asc" : "desc" })}
            >
              <DropdownMenuRadioItem value="default">{t("dashboard.panel.sortDefault")}</DropdownMenuRadioItem>
              {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                <DropdownMenuRadioItem key={k} value={k}>
                  {sortLabels[k]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        )}
        {onDetailsOpenChange && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={!!detailsOpen} onCheckedChange={(c) => onDetailsOpenChange(!!c)}>
              <DetailsPanelIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
              {t("dashboard.panel.showDetails")}
              <kbd className="ml-auto pl-3 font-sans text-xs text-fg-3">I</kbd>
            </DropdownMenuCheckboxItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface NewMenuProps {
  onUpload: () => void;
  onNewFolder: () => void;
  /** Panoda öğe varken görünür. */
  onPaste?: () => void;
  disabled?: boolean;
  /** Pazarlama/ekstra öğeler (örn. Ultra'da "Drive'dan seç"). */
  extraItems?: ReactNode;
}

/** New ▾ (primary): ekranın tek birincil eylemi. Mobilde 40×40 ikon. */
export function NewMenu({ onUpload, onNewFolder, onPaste, disabled, extraItems }: NewMenuProps) {
  const { t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="primary"
          size="md"
          className="ml-1 gap-1.5 max-sm:size-10 max-sm:px-0"
          aria-label={t("dashboard.panel.new")}
        >
          <AddIcon className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t("dashboard.panel.new")}</span>
          <ChevronDownIcon className="hidden h-3.5 w-3.5 opacity-70 sm:block" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={onUpload}>
          <UploadIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
          {t("dashboard.panel.uploadFiles")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onNewFolder}>
          <NewFolderIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
          {t("dashboard.panel.newFolder")}
        </DropdownMenuItem>
        {onPaste && (
          <DropdownMenuItem onSelect={onPaste}>
            <PasteIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
            {t("dashboard.panel.pasteHere")}
          </DropdownMenuItem>
        )}
        {extraItems}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Mobil üst çubuk: arama ikonu (palete açar). */
export function MobileSearchButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <Button variant="ghost" size="icon" className="md:hidden" onClick={onClick} aria-label={t("dashboard.panel.search")}>
      <SearchIcon className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}
