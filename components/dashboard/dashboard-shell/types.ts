import type { ReactNode } from "react";
import type { SmartCollection } from "@/lib/types";
import type { DriveConnectionStatus } from "@/lib/google-drive/drive-connection-state";
import type { DriveAccount } from "@/lib/google-drive/api/storage";

type DriveBrowseMode = "normal" | "sharedWithMe" | "sharedDrives" | "sharedDriveFolder";
type TaggedListMode = "taggedFiles" | "taggedFolders";

export type SidebarViewMode =
  | DriveBrowseMode
  | TaggedListMode
  | "trash"
  | "graph"
  | "editLabels"
  | "manageProperties";

export type FolderTreeItem = { id: string; name: string; isFolder: boolean };

/** Hangi ekrandayız, klasör yolunda neredeyiz. */
interface SidebarLocation {
  viewMode: SidebarViewMode;
  onViewChange: (mode: SidebarViewMode) => void;
  folderPath?: { id: string | null; name: string }[];
  onFolderNavigate?: (index: number) => void;
}

/** Kenar çubuğunda gösterilen sayaçlar ve Drive depolama durumu. */
interface SidebarSummary {
  taggedFilesCount: number;
  taggedFoldersCount: number;
  isDriveConnected: boolean;
  driveStorage?: { limit: number | null; usage: number } | null;
}

/** FOLDERS ağacının verisi ve olayları. */
interface SidebarFolderTree {
  rootTreeItems?: FolderTreeItem[];
  folderTreeItems?: FolderTreeItem[];
  folderChildren?: Record<string, FolderTreeItem[]>;
  ensureExpandedFolderIds?: string[];
  onFolderExpand?: (folderId: string) => void;
  onFolderTreeItemClick?: (item: FolderTreeItem) => void;
}

export interface SidebarNavConfig extends SidebarLocation, SidebarSummary, SidebarFolderTree {
  smartCollections?: SmartCollection[];
  onCollectionClick?: (collection: SmartCollection) => void;
  activeCollectionId?: string | null;
  /** Kenar çubuğundaki "Search ⌘K" komut paletini açar. */
  onOpenSearch?: () => void;
  /** Çalışma alanı menüsündeki "Change Drive folder" (eski üst çubuk "Select folder"). */
  onChangeFolder?: () => void;
  changingFolder?: boolean;
}

export interface DashboardShellProps {
  /** Bağlı Google hesabı; hesap yoksa null. */
  account: DriveAccount | null;
  driveStatus: DriveConnectionStatus;
  onConnectDrive: () => void;
  onDisconnectDrive: () => Promise<void>;
  /** İçerik bölgesinde iskelet gösterir; kabuk her zaman çizilir. */
  loading?: boolean;
  sidebarNav?: SidebarNavConfig;
  customSidebar?: ReactNode;
  children: ReactNode;
}
