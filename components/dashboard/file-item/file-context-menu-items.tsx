"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/i18n-context";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CopyIcon, CutIcon, DeleteIcon, EditIcon, TagIcon, DocumentIcon, ExternalLinkIcon, DownloadIcon } from "@/components/icons";
import { getFileLocationUrl } from "@/lib/google-drive/google-drive";
import type { FileContextMenuItemsProps } from "./types";

/**
 * Shared menu items for file actions
 * Can render as ContextMenu items or DropdownMenu items based on variant
 */
export function FileContextMenuItems({
  file,
  onDownload,
  onAddLabel,
  onCopy,
  onCut,
  onRename,
  onDelete,
  onOpenDetails,
  variant = "context",
}: FileContextMenuItemsProps) {
  const { t } = useI18n();
  const locationUrl = getFileLocationUrl(file);

  // Use appropriate components based on variant
  const MenuItem = variant === "context" ? ContextMenuItem : DropdownMenuItem;
  const MenuSeparator = variant === "context" ? ContextMenuSeparator : DropdownMenuSeparator;

  const openLocation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (locationUrl) window.open(locationUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <MenuItem onClick={(e) => { e.stopPropagation(); onDownload?.(file); }}>
        <DownloadIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
        {t("common.download")}
      </MenuItem>
      <MenuItem onClick={(e) => { e.stopPropagation(); onAddLabel(file); }}>
        <TagIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
        {t("dashboard.addLabel")}
      </MenuItem>
      {locationUrl && (
        <MenuItem onClick={openLocation}>
          <ExternalLinkIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
          {t("dashboard.openInDrive")}
        </MenuItem>
      )}
      <MenuSeparator />
      <MenuItem onClick={(e) => { e.stopPropagation(); onCopy(file); }}>
        <CopyIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
        {t("common.copy")}
      </MenuItem>
      <MenuItem onClick={(e) => { e.stopPropagation(); onCut(file); }}>
        <CutIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
        {t("common.cut")}
      </MenuItem>
      <MenuItem onClick={(e) => { e.stopPropagation(); onRename(file); }}>
        <EditIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
        {t("common.rename")}
      </MenuItem>
      {onOpenDetails && (
        <MenuItem onClick={(e) => { e.stopPropagation(); onOpenDetails(file); }}>
          <DocumentIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
          {t("dashboard.properties")}
        </MenuItem>
      )}
      <MenuSeparator />
      <MenuItem
        onClick={(e) => { e.stopPropagation(); onDelete(file); }}
        className="text-danger focus:bg-danger/8 focus:text-danger"
      >
        <DeleteIcon className="mr-2 h-4 w-4" aria-hidden="true" />
        {t("common.delete")}
      </MenuItem>
    </>
  );
}

/** Satırı ya da kartı sağ tıkla açılan dosya menüsüne bağlar. */
export function FileItemContextMenu({
  menu,
  children,
}: {
  menu: Omit<FileContextMenuItemsProps, "variant">;
  children: ReactNode;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <FileContextMenuItems {...menu} variant="context" />
      </ContextMenuContent>
    </ContextMenu>
  );
}
