"use client";

import { Fragment, type ReactNode } from "react";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, MinusIcon } from "@/components/icons";
import { FileItem } from "@/components/dashboard/file-item/file-item-list";
import { FileGridItem } from "@/components/dashboard/file-item/file-item-grid";
import type { FileItemBaseProps } from "@/components/dashboard/file-item/types";
import { Skeleton, useDelayedVisible } from "@/components/ui/loading";
import { ListRowsSkeleton } from "@/components/dashboard/dashboard-shell/shell-skeleton";
import { useI18n } from "@/lib/i18n/i18n-context";
import { cn } from "@/lib/utils";
import { sortFiles, nextSort, type SortKey, type SortState } from "@/lib/ui/sort-files";
import { isFolder, type DriveFile } from "@/lib/google-drive/google-drive";

export interface FileGroup {
  key: string;
  /** Arama sonuçlarında "Folders (3)" gibi grup başlığı. */
  title?: string;
  files: DriveFile[];
}

interface FileCollectionProps {
  displayMode: "list" | "grid";
  /** Bölgenin ilk yüklemesi: 150ms gecikmeli, satır şeklinde durağan iskelet. */
  loading: boolean;
  groups: FileGroup[];
  /** Liste görünümünde gruplardan sonra (örn. arama: eşleşen etiketler). */
  extra?: ReactNode;
  /** Hiç öğe yokken (ve yüklenmiyorken) gösterilen boş durum. */
  empty: ReactNode;
  itemProps: (file: DriveFile) => Omit<FileItemBaseProps, "file">;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  selectedCount: number;
  onToggleAll?: () => void;
  ariaLabel: string;
}

function SelectAllBox({ state, label, onToggle }: { state: "none" | "some" | "all"; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "all" ? true : state === "some" ? "mixed" : false}
      aria-label={label}
      onClick={onToggle}
      className="group/box flex size-6 items-center justify-center rounded-sm focus-visible:outline-none"
    >
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded-sm border group-focus-visible/box:ring-2 group-focus-visible/box:ring-ring group-focus-visible/box:ring-offset-1",
          state === "none" ? "border-control bg-raised" : "border-fg bg-fg text-canvas"
        )}
      >
        {state === "all" && <CheckIcon className="h-3 w-3" aria-hidden="true" />}
        {state === "some" && <MinusIcon className="h-3 w-3" aria-hidden="true" />}
      </span>
    </button>
  );
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSortChange,
  className,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  sort?: SortState;
  onSortChange?: (s: SortState) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const active = sort?.key === sortKey ? sort.dir : null;
  const ariaSort = active === "asc" ? "ascending" : active === "desc" ? "descending" : "none";
  const Arrow = active === "asc" ? ArrowUpIcon : ArrowDownIcon;
  return (
    <div role="columnheader" aria-sort={ariaSort} className={className}>
      {onSortChange ? (
        <button
          type="button"
          onClick={() => onSortChange(nextSort(sort ?? null, sortKey))}
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded-sm px-1 hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            align === "right" ? "-mr-1 flex-row-reverse" : "-ml-1",
            active && "text-fg"
          )}
        >
          {label}
          <Arrow className={cn("h-3 w-3", active ? "opacity-100" : "opacity-0")} aria-hidden="true" />
        </button>
      ) : (
        label
      )}
    </div>
  );
}

/** Sıralamayı koruyarak [klasörler, dosyalar]. */
function splitFolders(files: DriveFile[]): [DriveFile[], DriveFile[]] {
  const folders: DriveFile[] = [];
  const rest: DriveFile[] = [];
  for (const f of files) (isFolder(f) ? folders : rest).push(f);
  return [folders, rest];
}

function GridSkeleton() {
  const visible = useDelayedVisible(true);
  if (!visible) return null;
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} aria-hidden="true" className="overflow-hidden rounded-lg border border-line">
          <Skeleton className="aspect-[16/10] w-full" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </>
  );
}

function DelayedRows() {
  const visible = useDelayedVisible(true);
  return visible ? <ListRowsSkeleton /> : null;
}

/**
 * Liste/ızgara gövdesi (spec §3): sticky 32px sütun başlığı (sıralanabilir,
 * aria-sort), 40px satırlar, 200px kartlar. Yükleme, boş durum ve gruplar tek
 * yerde — Drive ve Ultra sayfaları aynı bileşeni kullanır.
 */
export function FileCollection({
  displayMode,
  loading,
  groups,
  extra,
  empty,
  itemProps,
  sort,
  onSortChange,
  selectedCount,
  onToggleAll,
  ariaLabel,
}: FileCollectionProps) {
  const { t } = useI18n();
  const total = groups.reduce((n, g) => n + g.files.length, 0);
  const isEmpty = !loading && total === 0 && !extra;
  const selectState = selectedCount === 0 ? "none" : selectedCount >= total && total > 0 ? "all" : "some";
  const status = loading ? (
    <p role="status" className="sr-only">
      {t("dashboard.panel.loadingFiles")}
    </p>
  ) : null;

  if (isEmpty) return <>{empty}</>;

  if (displayMode === "grid") {
    return (
      <div className="p-4">
        {status}
        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            <GridSkeleton />
          </div>
        ) : (
          groups.map((g) =>
            g.files.length === 0 ? null : (
              <section key={g.key} aria-label={g.title ?? ariaLabel} className="mb-6 last:mb-0">
                {g.title && <h2 className="mb-2 text-xs font-medium text-fg-3">{g.title}</h2>}
                {/* Klasörler önce, kendi satırlarında kompakt kutucuk; dosyalar
                    önizlemeli kart (kutucuk ve kart aynı satırda karışmaz). */}
                {splitFolders(sortFiles(g.files, sort ?? null)).map((part) =>
                  part.length === 0 ? null : (
                    <div
                      key={isFolder(part[0]) ? "folders" : "files"}
                      role="list"
                      className="mb-3 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 last:mb-0 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]"
                    >
                      {part.map((file) => (
                        <FileGridItem key={file.id} file={file} {...itemProps(file)} selectionActive={selectedCount > 0} />
                      ))}
                    </div>
                  )
                )}
              </section>
            )
          )
        )}
      </div>
    );
  }

  return (
    <div role="table" aria-label={ariaLabel} aria-busy={loading || undefined} className="pb-4">
      {status}
      <div role="rowgroup" className="sticky top-0 z-10 hidden bg-canvas px-2 sm:block">
        <div role="row" className="flex h-8 items-center gap-3 border-b border-line px-2 text-xs font-medium text-fg-3">
          <div role="columnheader" className="flex w-6 shrink-0 justify-center">
            {onToggleAll && total > 0 && (
              <SelectAllBox state={selectState} label={t("dashboard.panel.selectAll")} onToggle={onToggleAll} />
            )}
          </div>
          <SortHeader label={t("dashboard.panel.colName")} sortKey="name" sort={sort} onSortChange={onSortChange} className="min-w-0 flex-1 pl-6.5" />
          <SortHeader label={t("dashboard.panel.colSize")} sortKey="size" sort={sort} onSortChange={onSortChange} className="w-22 shrink-0 text-right" align="right" />
          <SortHeader label={t("dashboard.panel.colModified")} sortKey="modified" sort={sort} onSortChange={onSortChange} className="w-32 shrink-0 text-right" align="right" />
          <div role="columnheader" className="w-8 shrink-0">
            <span className="sr-only">{t("dashboard.panel.moreActions")}</span>
          </div>
        </div>
      </div>
      <div role="rowgroup" className="px-2 pt-1">
        {loading ? (
          <DelayedRows />
        ) : (
          groups.map((g) =>
            g.files.length === 0 ? null : (
              <Fragment key={g.key}>
                {g.title && (
                  <div role="row" className="px-2 pb-1 pt-3 text-xs font-medium text-fg-3">
                    <span role="cell">{g.title}</span>
                  </div>
                )}
                {sortFiles(g.files, sort ?? null).map((file) => (
                  <FileItem key={file.id} file={file} {...itemProps(file)} selectionActive={selectedCount > 0} />
                ))}
              </Fragment>
            )
          )
        )}
        {!loading && extra}
      </div>
    </div>
  );
}
