"use client";

import { logger } from "@/lib/logger";
import type { DriveFile } from "@/lib/types";
import {
  isFolder,
  renameDriveFile,
  deleteDriveFile,
  trashDriveFile,
} from "@/lib/google-drive/google-drive";
import { downloadSingleFile, downloadAsZip } from "@/lib/google-drive/download-utils";

interface UseFileOperationsParams {
  accessToken: string | null;
  executeDriveCall: <T>(call: (token: string) => Promise<T>) => Promise<T>;
  refreshFiles: () => Promise<void>;
  viewMode: string;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  getSelectedFiles: () => DriveFile[];
  setIsLoadingFiles: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getSafeMessage: (err: unknown, fallback: string) => string;
  t: (key: string) => string;
  setIsRenaming: (renaming: boolean) => void;
  setRenameFile: (file: DriveFile | null) => void;
  setDeleteConfirmOpen: (open: boolean) => void;
  setDeleteConfirmItems: (items: DriveFile[] | null) => void;
  deleteConfirmItems: DriveFile[] | null;
}

export function useFileOperations({
  accessToken,
  executeDriveCall,
  refreshFiles,
  viewMode,
  selectedIds,
  setSelectedIds,
  getSelectedFiles,
  setIsLoadingFiles,
  setError,
  getSafeMessage,
  t,
  setIsRenaming,
  setRenameFile,
  setDeleteConfirmOpen,
  setDeleteConfirmItems,
  deleteConfirmItems,
}: UseFileOperationsParams) {
  /** Tek bir işlemin meşgul durumu, hata sıfırlama ve yenileme akışı. */
  const runTracked = async (
    setBusy: (busy: boolean) => void,
    failureLog: string,
    work: () => Promise<void>
  ) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      await refreshFiles();
    } catch (err) {
      logger.error(failureLog, err);
      throw err;
    } finally {
      setBusy(false);
    }
  };

  /** Çoklu seçimin içindeki bir dosyada eylem tüm seçime uygulanır. */
  const expandToSelection = (file: DriveFile) =>
    selectedIds.has(file.id) && selectedIds.size > 1 ? getSelectedFiles() : [file];

  const clearSelection = () => setSelectedIds(new Set());

  const handleRename = (fileId: string, newName: string) =>
    runTracked(setIsRenaming, "Error renaming:", async () => {
      await executeDriveCall((token) => renameDriveFile(token, fileId, newName));
      setRenameFile(null);
    });

  const handleDeleteRequest = (file: DriveFile) => {
    setDeleteConfirmOpen(true);
    setDeleteConfirmItems(expandToSelection(file));
  };

  const handleDeleteConfirm = async () => {
    const items = deleteConfirmItems ?? [];
    if (items.length === 0) return;

    const removeOne: (token: string, fileId: string) => Promise<unknown> =
      viewMode === "trash" ? deleteDriveFile : trashDriveFile;

    await runTracked(setIsLoadingFiles, "Error deleting:", async () => {
      for (const { id } of items) {
        await executeDriveCall((token) => removeOne(token, id));
      }
      clearSelection();
      setDeleteConfirmItems(null);
      setDeleteConfirmOpen(false);
    });
  };

  const handleDownload = async (file?: DriveFile) => {
    if (!accessToken) return;

    const items = file ? expandToSelection(file) : getSelectedFiles();
    if (items.length === 0) return;
    setError(null);

    const [first] = items;
    try {
      if (items.length > 1 || isFolder(first)) {
        const zipName = items.length === 1 ? first.name : t("dashboard.downloadZipName");
        await downloadAsZip(accessToken, items, `${zipName}.zip`);
      } else {
        await downloadSingleFile(accessToken, first);
      }
      clearSelection();
    } catch (err) {
      logger.error("Error downloading:", err);
      setError(getSafeMessage(err, t("dashboard.downloadFailed")));
    }
  };

  return {
    handleRename,
    handleDeleteRequest,
    handleDeleteConfirm,
    handleDownload,
  };
}
