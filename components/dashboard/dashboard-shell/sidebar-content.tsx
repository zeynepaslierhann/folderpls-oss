"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { SearchIcon, TagIcon, TagsIcon, DriveIcon, DeleteIcon, GraphIcon, BookmarkIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { SidebarTreeFolder, type FolderTreeShared } from "./sidebar-tree-folder";
import { SidebarStorage } from "./sidebar-storage";
import { WorkspaceMenu } from "./workspace-menu";
import type { DriveConnectionStatus } from "@/lib/google-drive/drive-connection-state";
import type { DriveAccount } from "@/lib/google-drive/api/storage";
import type { SidebarNavConfig, SidebarViewMode } from "./types";

interface SidebarContentProps {
  /** Yoksa (örn. organizasyon ayarları) kenar çubuğu bağlantı modunda çizilir. */
  sidebarNav?: SidebarNavConfig;
  expandedFolderIds: Set<string>;
  onToggleFolderExpand: (folderId: string) => void;
  account: DriveAccount | null;
  driveStatus: DriveConnectionStatus;
  onConnectDrive: () => void;
  onDisconnectDrive: () => Promise<void>;
  t: (key: string) => string;
}

const itemClass = (active: boolean) =>
  cn(
    "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors duration-[var(--dur-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active ? "bg-accent-soft font-medium text-fg" : "text-fg-2 hover:bg-hover hover:text-fg"
  );

function NavButton({
  active,
  onClick,
  icon,
  children,
  trailing,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <button type="button" data-close-nav="" onClick={onClick} aria-current={active ? "page" : undefined} className={itemClass(active)}>
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing}
    </button>
  );
}

const iconCls = "h-4 w-4 shrink-0";

/**
 * Kenar çubuğu (spec §2.1), yukarıdan aşağı: çalışma alanı menüsü,
 * Search ⌘K, ana gezinme (Drive · Tagged · Graph), kayıtlı görünümler,
 * FOLDERS ağacı; altta Labels, Trash ve depolama.
 */
export function SidebarContent({
  sidebarNav,
  expandedFolderIds,
  onToggleFolderExpand,
  account,
  driveStatus,
  onConnectDrive,
  onDisconnectDrive,
  t,
}: SidebarContentProps) {
  const mode = sidebarNav?.viewMode;
  const go = (m: SidebarViewMode) => () => sidebarNav?.onViewChange(m);
  const treeItems = sidebarNav?.rootTreeItems ?? sidebarNav?.folderTreeItems;
  const folders = treeItems?.filter((i) => i.isFolder) ?? [];
  const path = sidebarNav?.folderPath;
  const activeFolderId = mode === "normal" && path && path.length > 1 ? path[path.length - 1].id : null;
  const folderTree: FolderTreeShared = {
    openIds: expandedFolderIds,
    childrenByFolder: sidebarNav?.folderChildren,
    toggle: onToggleFolderExpand,
    select: (entry) => sidebarNav?.onFolderTreeItemClick?.(entry),
    activeId: activeFolderId,
    t,
  };
  const storage = sidebarNav?.isDriveConnected ? sidebarNav.driveStorage : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-1 p-3 pb-2">
        <WorkspaceMenu
          account={account}
          driveStatus={driveStatus}
          onConnectDrive={onConnectDrive}
          onDisconnectDrive={onDisconnectDrive}
          t={t}
          onChangeFolder={sidebarNav?.onChangeFolder}
          changingFolder={sidebarNav?.changingFolder}
        />
        {sidebarNav?.onOpenSearch && (
          <button
            type="button"
            data-close-nav=""
            onClick={sidebarNav.onOpenSearch}
            className="flex h-8 w-full items-center gap-2 rounded-md border border-control bg-raised px-2 text-left text-sm text-fg-3 transition-colors duration-[var(--dur-fast)] hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SearchIcon className={iconCls} aria-hidden="true" />
            <span className="flex-1">{t("dashboard.panel.search")}</span>
            <kbd className="rounded-sm border border-line px-1 font-sans text-xs text-fg-3">⌘K</kbd>
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {sidebarNav ? (
          <div className="space-y-0.5">
            <NavButton active={mode === "normal"} onClick={go("normal")} icon={<DriveIcon className={iconCls} aria-hidden="true" />}>
              {t("dashboard.panel.drive")}
            </NavButton>
            <NavButton
              active={mode === "taggedFiles"}
              onClick={go("taggedFiles")}
              icon={<TagIcon className={iconCls} aria-hidden="true" />}
              trailing={
                sidebarNav.taggedFilesCount > 0 ? (
                  <span className="text-xs text-fg-3 tabular-nums">{sidebarNav.taggedFilesCount}</span>
                ) : null
              }
            >
              {t("dashboard.panel.tagged")}
            </NavButton>
            <NavButton active={mode === "graph"} onClick={go("graph")} icon={<GraphIcon className={iconCls} aria-hidden="true" />}>
              {t("dashboard.panel.graph")}
            </NavButton>
          </div>
        ) : (
          <Link href="/dashboard" data-close-nav="" className={itemClass(false)}>
            <DriveIcon className={iconCls} aria-hidden="true" />
            <span className="flex-1 truncate">{t("dashboard.panel.drive")}</span>
          </Link>
        )}

        {sidebarNav?.smartCollections && sidebarNav.smartCollections.length > 0 && (
          <section className="mt-4" aria-labelledby="sidebar-saved-views">
            <h2 id="sidebar-saved-views" className="px-2 pb-1 text-xs font-medium text-fg-3">
              {t("dashboard.panel.savedViews")}
            </h2>
            <div className="space-y-0.5">
              {sidebarNav.smartCollections.map((collection) => (
                <NavButton
                  key={collection.id}
                  active={sidebarNav.activeCollectionId === collection.id}
                  onClick={() => sidebarNav.onCollectionClick?.(collection)}
                  icon={<BookmarkIcon className={iconCls} aria-hidden="true" />}
                  trailing={
                    typeof collection.itemCount === "number" && collection.itemCount > 0 ? (
                      <span className="text-xs text-fg-3 tabular-nums">{collection.itemCount}</span>
                    ) : null
                  }
                >
                  {collection.name}
                </NavButton>
              ))}
            </div>
          </section>
        )}

        {sidebarNav && folders.length > 0 && (
          <section className="mt-4" aria-labelledby="sidebar-folders">
            <h2 id="sidebar-folders" className="px-2 pb-1 text-xs font-medium text-fg-3">
              {t("dashboard.panel.folders")}
            </h2>
            {folders.map((item) => (
              <SidebarTreeFolder key={item.id} item={item} tree={folderTree} />
            ))}
          </section>
        )}
      </div>

      {sidebarNav && (
        <div className="space-y-0.5 border-t border-line p-3">
          <NavButton active={mode === "editLabels"} onClick={go("editLabels")} icon={<TagsIcon className={iconCls} aria-hidden="true" />}>
            {t("dashboard.panel.labels")}
          </NavButton>
          <NavButton active={mode === "trash"} onClick={go("trash")} icon={<DeleteIcon className={iconCls} aria-hidden="true" />}>
            {t("dashboard.panel.trash")}
          </NavButton>
          {/* Depolama satırının yeri her durumda ayrılır (bağlı değil, hata,
              yükleniyor): Labels/Trash kenar çubuğunda zıplamaz. */}
          <div className="h-9 pt-3">
            {storage && <SidebarStorage driveStorage={storage} t={t} />}
          </div>
        </div>
      )}
    </div>
  );
}
