"use client";

import { Fragment, memo, useMemo } from "react";
import { formatDate, formatFileSize, cn } from "@/lib/utils";
import { MAX_VISIBLE_LABELS_GRID } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { TagChipList } from "@/components/ui/tag-chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreIcon } from "@/components/icons";
import { getFileThumbnailUrl } from "@/lib/google-drive/google-drive";
import { DriveImage } from "../drive-image";
import { FileContextMenuItems, FileItemContextMenu } from "./file-context-menu-items";
import { useFileItemModel } from "./use-file-item-model";
import { FileTypeIcon } from "./file-type";
import { RowCheckbox } from "./row-checkbox";
import type { FileItemBaseProps } from "./types";

/**
 * Izgara kartı (spec §3): --r-lg, --line sınır, 16:10 önizleme; altında ad
 * (tek satır), çipler ve meta. Hover'da yalnız sınır --control olur.
 *
 * Klasörler önizlemesiz, kompakt kutucuk: içinde yalnız bir klasör ikonu olan
 * 16:10'luk boş bej alanlar ızgaranın üst yarısını kaplıyordu. Seçim kutusu
 * ikonun yerinde belirir (hover/odak/seçim), ayrı bir sütun açmaz.
 */
export const FileGridItem = memo(function FileGridItem(props: FileItemBaseProps) {
  const { file, accessToken, selected = false, selectionActive = false, onSelect } = props;
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

  const thumbnailUrl = useMemo(() => getFileThumbnailUrl(file), [file]);
  const meta = [file.size ? formatFileSize(file.size) : null, formatDate(file.modifiedTime, dateLocale)].filter((part): part is string => Boolean(part));

  const icon = (
    <div className="flex h-full w-full items-center justify-center">
      <FileTypeIcon file={file} className="h-8 w-8" />
    </div>
  );

  const actionsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={folder ? "ghost" : "secondary"}
          size="icon-sm"
          className={cn(
            "opacity-0 group-hover/item:opacity-100 group-focus-within/item:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100",
            !folder && "border-line"
          )}
          aria-label={t("dashboard.panel.moreActionsFor").replace("{name}", file.name)}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <MoreIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <FileContextMenuItems {...menuProps} variant="dropdown" />
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const cardProps = {
    role: "listitem",
    tabIndex: 0,
    "data-file-id": file.id,
    draggable,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onDragOver: folder ? handleDragOver : undefined,
    onDragLeave: folder ? handleDragLeave : undefined,
    onDrop: folder ? handleDrop : undefined,
    onClick: handleRowClick,
    onDoubleClick: handleDoubleClick,
    onKeyDown: handleKeyDown,
  } as const;

  const cardState = cn(
    "group/item relative min-w-0 cursor-default rounded-lg border bg-raised outline-none transition-colors duration-[var(--dur-fast)] focus-visible:ring-2 focus-visible:ring-ring",
    selected ? "border-control bg-accent-soft" : "border-line hover:border-control",
    dropTarget && "border-control bg-accent-soft"
  );

  if (folder) {
    const boxVisible = selected || selectionActive;
    return (
      <FileItemContextMenu menu={menuProps}>
        <div {...cardProps} className={cn(cardState, "flex flex-col gap-1.5 py-2 pl-2 pr-1.5")}>
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="relative flex size-6 shrink-0 items-center justify-center">
              <FileTypeIcon
                file={file}
                className={cn(
                  "transition-opacity duration-[var(--dur-fast)]",
                  boxVisible || !onSelect
                    ? boxVisible && "opacity-0"
                    : "group-hover/item:opacity-0 group-focus-within/item:opacity-0 pointer-coarse:opacity-0"
                )}
              />
              {onSelect && (
                <RowCheckbox
                  checked={selected}
                  forceVisible={selectionActive}
                  label={t("dashboard.panel.selectItem").replace("{name}", file.name)}
                  onToggle={handleCheckboxClick}
                  className="absolute inset-0"
                />
              )}
            </div>
            <span className="min-w-0 flex-1 truncate text-base text-fg" title={`${file.name} · ${typeLabel}`}>
              {file.name}
            </span>
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              {actionsMenu}
            </div>
          </div>
          {chips.length > 0 && <TagChipList labels={chips} max={MAX_VISIBLE_LABELS_GRID} className="flex-wrap pl-7.5" />}
        </div>
      </FileItemContextMenu>
    );
  }

  return (
    <FileItemContextMenu menu={menuProps}>
      <div
        {...cardProps}
        className={cn(cardState, "flex flex-col overflow-hidden")}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-line bg-hover">
          {thumbnailUrl ? (
            <DriveImage
              src={thumbnailUrl}
              alt=""
              accessToken={accessToken}
              className="h-full w-full object-cover"
              fallback={icon}
            />
          ) : (
            icon
          )}
          {onSelect && (
            <RowCheckbox
              checked={selected}
              forceVisible={selectionActive}
              label={t("dashboard.panel.selectItem").replace("{name}", file.name)}
              onToggle={handleCheckboxClick}
              className="absolute left-1 top-1"
            />
          )}
          <div className="absolute right-1.5 top-1.5" onClick={(e) => e.stopPropagation()}>
            {actionsMenu}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <FileTypeIcon file={file} />
            <span className="truncate text-base text-fg" title={`${file.name} · ${typeLabel}`}>
              {file.name}
            </span>
          </div>
          {chips.length > 0 && <TagChipList labels={chips} max={MAX_VISIBLE_LABELS_GRID} className="flex-wrap" />}
          {/* Dar kartta satır "·" yerinde kırılır; tarih ("Sep / 28, 2026") ortasından bölünmez. */}
          <p className="text-sm text-fg-2 tabular-nums">
            {meta.map((part, i) => (
              <Fragment key={i}>
                {i > 0 && " "}
                <span className="whitespace-nowrap">{i < meta.length - 1 ? `${part} ·` : part}</span>
              </Fragment>
            ))}
          </p>
        </div>
      </div>
    </FileItemContextMenu>
  );
});
