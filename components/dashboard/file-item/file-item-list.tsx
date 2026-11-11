"use client";

import { memo, type CSSProperties, type MouseEvent } from "react";
import { formatDate, formatFileSize, cn } from "@/lib/utils";
import { MAX_VISIBLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { TagChipList } from "@/components/ui/tag-chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreIcon } from "@/components/icons";
import { FileContextMenuItems, FileItemContextMenu } from "./file-context-menu-items";
import { useFileItemModel } from "./use-file-item-model";
import { FileTypeIcon } from "./file-type";
import { RowCheckbox } from "./row-checkbox";
import type { FileItemBaseProps } from "./types";

const keepClickInMenu = (e: MouseEvent) => e.stopPropagation();

/**
 * Liste satırı (spec §3): 40px tek satır — seçim | ad + etiket çipleri |
 * boyut | tarih | ⋯. Sütunlar klasör ve dosya satırlarında aynı yerde durur
 * (klasör chevron'u ve "Folder/PDF" alt satırı kaldırıldı; tür ikondan ve
 * ad üzerindeki title'dan okunur). Mobilde ≥56px: ad, meta; etiket varsa
 * çipler üçüncü satırda. Eylem sütunu (⋯) her genişlikte ayrılır.
 *
 * Etkileşim: tek tık seçer, çift tık / Enter açar. Hover'da ölçek ve gölge yok.
 *
 * Erişilebilirlik: kapsayıcı role="table" (grid değil: hücreler arası ok tuşu
 * gezintisi yok); aria-selected tablo satırında desteklenmediği için seçim
 * durumu satırdaki role="checkbox" (aria-checked) ile duyurulur.
 */
export const FileItem = memo(function FileItem(props: FileItemBaseProps) {
  const { file, selected = false, selectionActive = false, onSelect } = props;
  const { t, dateLocale, dropTarget, actions, folder, typeLabel, chips, menuProps, draggable } = useFileItemModel(props);
  const {
    handleDoubleClick,
    handleRowClick,
    handleCheckboxClick,
    handleKeyDown,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = actions;

  const size = folder ? "—" : formatFileSize(file.size);
  const date = formatDate(file.modifiedTime, dateLocale);

  const pointerHandlers = { onClick: handleRowClick, onDoubleClick: handleDoubleClick };

  return (
    <FileItemContextMenu menu={menuProps}>
      <div
        role="row"
        tabIndex={0}
        data-file-id={file.id}
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={folder ? handleDragOver : undefined}
        onDragLeave={folder ? handleDragLeave : undefined}
        onDrop={folder ? handleDrop : undefined}
          {...pointerHandlers}
        onKeyDown={handleKeyDown}
        className={cn(
          "group/item flex min-h-14 cursor-default items-center gap-3 rounded-md px-2 py-2 outline-none transition-colors duration-[var(--dur-fast)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:h-10 sm:min-h-0 sm:py-0",
          selected ? "bg-accent-soft" : "hover:bg-hover",
          dropTarget && "bg-accent-soft ring-1 ring-inset ring-control"
        )}
      >
        <div role="cell" className="flex w-6 shrink-0 justify-center">
          {onSelect && (
            <RowCheckbox
              checked={selected}
              forceVisible={selectionActive}
              label={t("dashboard.panel.selectItem").replace("{name}", file.name)}
              onToggle={handleCheckboxClick}
            />
          )}
        </div>

        <div role="cell" className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
          <FileTypeIcon file={file} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-base text-fg" title={`${file.name} · ${typeLabel}`}>
                {file.name}
              </span>
              <TagChipList labels={chips} max={MAX_VISIBLE_LABELS} className="hidden sm:flex" />
            </div>
            {/* Mobil: meta satırı tek başına (tarih hiç kesilmez); çipler varsa
                kendi satırında, en fazla 2 + "+N". */}
            <p className="truncate text-sm text-fg-2 tabular-nums sm:hidden">
              {[typeLabel, folder || !file.size ? null : size, date].filter(Boolean).join(" · ")}
            </p>
            {chips.length > 0 && <TagChipList labels={chips} max={2} className="mt-1 overflow-hidden sm:hidden" />}
          </div>
        </div>

        <div role="cell" className="hidden w-22 shrink-0 text-right text-sm text-fg-2 tabular-nums sm:block">
          {size}
        </div>
        <div role="cell" className="hidden w-32 shrink-0 text-right text-sm text-fg-2 tabular-nums sm:block">
          {date}
        </div>

        <div role="cell" className="flex w-8 shrink-0 justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={keepClickInMenu}>
              <Button
                variant="ghost"
                size="icon-sm"
                className="opacity-0 group-hover/item:opacity-100 group-focus-within/item:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100"
                aria-label={t("dashboard.panel.moreActionsFor").replace("{name}", file.name)}
                onDoubleClick={(e) => e.stopPropagation()}
              >
                <MoreIcon className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52" style={{ zIndex: 110 } as CSSProperties}>
              <FileContextMenuItems {...menuProps} variant="dropdown" />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </FileItemContextMenu>
  );
});
