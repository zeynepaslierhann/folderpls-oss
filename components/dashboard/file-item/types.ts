import type { DriveFile } from "@/lib/google-drive/google-drive";
import type { LabelItem } from "@/lib/types";

type FileAction = (file: DriveFile) => void;

/** Satırı açan ve menüden tetiklenen eylemler. */
interface FileItemCallbacks {
  onOpenFolder: FileAction;
  onPreview: FileAction;
  onCopy: FileAction;
  onCut: FileAction;
  onDelete: FileAction;
  onRename: FileAction;
  onAddLabel: FileAction;
  onDownload: (file?: DriveFile) => void;
  onOpenDetails?: FileAction;
}

/** Klasöre sürükle-bırak için gerekenler; verilmezse satır sürüklenemez. */
interface FileItemDragSupport {
  dragFileIds?: string[];
  onMoveToFolder?: (folderId: string, items: DriveFile[]) => void;
  getDisplayedFiles?: () => DriveFile[];
}

/**
 * Shared props for FileItem and FileGridItem components
 */
export interface FileItemBaseProps extends FileItemCallbacks, FileItemDragSupport {
  file: DriveFile;
  accessToken: string;
  selected?: boolean;
  /** Herhangi bir öğe seçiliyken tüm satırlarda seçim kutusu görünür. */
  selectionActive?: boolean;
  onSelect?: (file: DriveFile, additive?: boolean) => void;
  labels?: LabelItem[];
  /** Built-in status badge (name + colors); undefined when no status is set. */
  statusOption?: { name: string; color: string; textColor?: string };
}

/**
 * Actions returned by useFileItemActions hook
 */
export interface FileItemActions {
  handleDoubleClick: () => void;
  handleRowClick: (e: React.MouseEvent) => void;
  handleCheckboxClick: (e: React.MouseEvent) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleDragStart: (e: React.DragEvent) => void;
  handleDragEnd: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent) => void;
}

/**
 * Props for FileContextMenuItems component
 */
export interface FileContextMenuItemsProps extends Pick<FileItemCallbacks, "onCopy" | "onCut"> {
  file: DriveFile;
  onDownload?: (file?: DriveFile) => void;
  onAddLabel: (file: DriveFile) => void;
  onRename: (file: DriveFile) => void;
  onDelete: (file: DriveFile) => void;
  onOpenDetails?: (file: DriveFile) => void;
  /** 'context' uses ContextMenuItem, 'dropdown' uses DropdownMenuItem */
  variant?: "context" | "dropdown";
}
