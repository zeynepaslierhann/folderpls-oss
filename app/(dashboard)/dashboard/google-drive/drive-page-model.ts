import type { FolderTreeItem, SidebarViewMode } from "@/components/dashboard/dashboard-shell";
import { VIEW_MODES, type ViewMode } from "@/lib/constants";
import { isFolder, type DriveFile } from "@/lib/google-drive/google-drive";
import type { ClipboardState } from "@/lib/hooks/use-drive-operations/types";
import type { DropFileEntry } from "@/lib/utils/drop-utils";
import type { FieldSetters } from "./use-field-state";

export type FolderCrumb = { id: string | null; name: string };
export type NamedDriveItem = Pick<DriveFile, "id" | "name">;
export type DriveItemKind = "file" | "folder";

export const DRIVE_DASHBOARD_PATH = "/dashboard/google-drive";
export const MY_DRIVE_CRUMB: FolderCrumb = { id: null, name: "My Drive" };

export interface BrowsingState {
  driveFiles: DriveFile[];
  isLoadingFiles: boolean;
  isDriveConnected: boolean;
  isInitialized: boolean;
  error: string | null;
  currentFolderId: string | null;
  folderPath: FolderCrumb[];
  rootFolder: NamedDriveItem | null;
  /** A FolderPls folder already sitting in Drive, waiting for the user to accept or skip it. */
  foundRootFolder: NamedDriveItem | null;
}

export const INITIAL_BROWSING: BrowsingState = {
  driveFiles: [],
  isLoadingFiles: false,
  isDriveConnected: false,
  isInitialized: false,
  error: null,
  currentFolderId: null,
  folderPath: [MY_DRIVE_CRUMB],
  rootFolder: null,
  foundRootFolder: null,
};

export interface WorkspaceUiState {
  selectedIds: Set<string>;
  detailsPanelFileId: string | null;
  clipboard: ClipboardState | null;
  displayMode: "list" | "grid";
  previewFile: DriveFile | null;
  labelDialogFile: NamedDriveItem | null;
  renameFile: NamedDriveItem | null;
  isRenaming: boolean;
  bulkLabelOpen: boolean;
  editLabelsOpen: boolean;
  createFolderDialogOpen: boolean;
  uploadDialogOpen: boolean;
  uploadDialogInitialEntries: DropFileEntry[] | null;
  deleteConfirmOpen: boolean;
  deleteConfirmItems: DriveFile[] | null;
}

export type WorkspaceUi = WorkspaceUiState & FieldSetters<WorkspaceUiState>;

export const INITIAL_WORKSPACE_UI: WorkspaceUiState = {
  selectedIds: new Set(),
  detailsPanelFileId: null,
  clipboard: null,
  displayMode: "list",
  previewFile: null,
  labelDialogFile: null,
  renameFile: null,
  isRenaming: false,
  bulkLabelOpen: false,
  editLabelsOpen: false,
  createFolderDialogOpen: false,
  uploadDialogOpen: false,
  uploadDialogInitialEntries: null,
  deleteConfirmOpen: false,
  deleteConfirmItems: null,
};

export interface SidebarDataState {
  folderChildrenData: Record<string, DriveFile[]>;
  rootTreeItems: FolderTreeItem[];
  driveStorage: { limit: number | null; usage: number } | null;
}

export const INITIAL_SIDEBAR_DATA: SidebarDataState = {
  folderChildrenData: {},
  rootTreeItems: [],
  driveStorage: null,
};

export function toTreeItems(files: DriveFile[]): FolderTreeItem[] {
  return files.map((file) => ({ id: file.id, name: file.name, isFolder: isFolder(file) }));
}

/** The dashboard URL for a folder; the drive root has no query string of its own. */
export function driveFolderHref(folderId: string | null, trail: FolderCrumb[]): string {
  if (!folderId || folderId === "root") return DRIVE_DASHBOARD_PATH;
  const query = new URLSearchParams({
    folder: folderId,
    path: btoa(encodeURIComponent(JSON.stringify(trail))),
  });
  return `${DRIVE_DASHBOARD_PATH}?${query}`;
}

/** Reads the `path` query value back, using `fallback` when it is missing or corrupt. */
export function decodeFolderTrail(encoded: string | null, fallback: FolderCrumb[]): FolderCrumb[] {
  if (!encoded) return fallback;
  try {
    return JSON.parse(decodeURIComponent(atob(encoded)));
  } catch {
    return fallback;
  }
}

export function taggedIdsOfKind(
  labelIdsByItem: Record<string, string[]>,
  kindByItem: Record<string, DriveItemKind>,
  kind: DriveItemKind
): string[] {
  return Object.entries(labelIdsByItem)
    .filter(([itemId, labelIds]) => labelIds.length > 0 && kindByItem[itemId] === kind)
    .map(([itemId]) => itemId);
}

export function taggedKindForView(view: string): DriveItemKind | null {
  if (view === VIEW_MODES.TAGGED_FILES) return "file";
  if (view === VIEW_MODES.TAGGED_FOLDERS) return "folder";
  return null;
}

export function sidebarModeFor(view: ViewMode, editingLabels: boolean): SidebarViewMode {
  if (editingLabels) return VIEW_MODES.EDIT_LABELS;
  return view === VIEW_MODES.SEARCH ? VIEW_MODES.NORMAL : (view as SidebarViewMode);
}

const TEXT_ENTRY_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function isTypingInField(): boolean {
  const focused = document.activeElement;
  if (!(focused instanceof HTMLElement)) return false;
  return TEXT_ENTRY_TAGS.has(focused.tagName) || focused.isContentEditable;
}
