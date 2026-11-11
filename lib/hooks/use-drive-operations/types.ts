import type { BulkLabelResult } from "./bulk-labels";
import type { LabelItem, TaggedItem, DriveFile } from "@/lib/types";
import type { LabelStore } from "@/lib/storage";

/**
 * Parameters for useDriveOperations hook
 */
export interface UseDriveOperationsParams {
  // Core dependencies
  /** Etiket ve etiketli öğe yazımları. */
  labelStore: LabelStore;
  /** Viewer (salt-okur organizasyon rolü) yazma işlemlerini kullanamaz. */
  accessToken: string | null;
  executeDriveCall: <T>(call: (token: string) => Promise<T>) => Promise<T>;
  refreshFiles: () => Promise<void>;
  currentFolderId: string | null;
  viewMode: string;

  // Tagged items state
  taggedItems: Record<string, string[]>;
  setTaggedItems: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  itemMetadata: Record<string, TaggedItem>;
  setItemMetadata: React.Dispatch<React.SetStateAction<Record<string, TaggedItem>>>;
  taggedItemsTypes: Record<string, "file" | "folder">;
  setTaggedItemsTypes: React.Dispatch<React.SetStateAction<Record<string, "file" | "folder">>>;

  // Labels
  userLabels: LabelItem[];
  setUserLabels: React.Dispatch<React.SetStateAction<LabelItem[]>>;

  // UI state
  setIsLoadingFiles: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getSafeMessage: (err: unknown, fallback: string) => string;
  t: (key: string) => string;

  // Selection
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  getSelectedFiles: () => DriveFile[];
  getDisplayedFiles: () => DriveFile[];

  /** İlk etiket uygulandığında (aktivasyon olayı). */
  onLabelApplied?: () => void;

  // Dialog state
  setDeleteConfirmOpen: (open: boolean) => void;
  setDeleteConfirmItems: (items: DriveFile[] | null) => void;
  deleteConfirmItems: DriveFile[] | null;
  setIsRenaming: (renaming: boolean) => void;
  setRenameFile: (file: DriveFile | null) => void;
  setIsUploading: (uploading: boolean) => void;

  // Clipboard
  setClipboard: (clipboard: ClipboardState | null) => void;
  clipboard: ClipboardState | null;
}

/**
 * Clipboard state for copy/cut operations
 */
export interface ClipboardState {
  items: DriveFile[];
  action: "copy" | "cut";
}

/** Henüz oluşturulmamış etiket: kimliğini depo verir. */
export type NewLabelInput = Omit<LabelItem, "id">;

interface LabelChoice {
  labelIds: string[];
  newLabels: NewLabelInput[];
}

/** Belirli bir tarihte kalkacak ("planlı") etiketler. */
export interface PlannedLabelOptions {
  plannedLabelIds?: string[];
  plannedNewLabels?: NewLabelInput[];
  plannedExpiresAt?: number;
}

/**
 * Options for creating a folder
 */
export type CreateFolderOptions = LabelChoice & PlannedLabelOptions;

/**
 * Options for uploading files
 */
export type UploadOptions = CreateFolderOptions & { onProgress?: (progress: number) => void };

/**
 * Options for saving labels
 */
export interface SaveLabelsOptions {
  labelExpiries?: Record<string, number>;
}

/**
 * Return type for useDriveOperations hook
 */
export interface UseDriveOperationsReturn {
  handleCreateFolder: (name: string, options: CreateFolderOptions) => Promise<void>;
  handleUploadWithLabels: (
    files: File[],
    options: UploadOptions,
    filePaths?: string[]
  ) => Promise<void>;
  handleUpdateLabels: (updatedLabels: LabelItem[], deletedLabelIds: string[]) => Promise<void>;
  handleSaveLabels: (fileId: string, labelIds: string[], freshLabels: NewLabelInput[], options?: SaveLabelsOptions) => Promise<void>;
  handleRename: (fileId: string, newName: string) => Promise<void>;
  handleDeleteRequest: (file: DriveFile) => void;
  handleDeleteConfirm: () => Promise<void>;
  handleDownload: (file?: DriveFile) => Promise<void>;
  handlePaste: () => Promise<void>;
  handleMoveToFolder: (targetFolderId: string, items: DriveFile[]) => Promise<void>;
  handleBulkAddLabels: (fileIds: string[], labelIds: string[], freshLabels: NewLabelInput[]) => Promise<BulkLabelResult>;
}
