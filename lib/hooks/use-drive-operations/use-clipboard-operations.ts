"use client";

import { useCallback } from "react";
import { logger } from "@/lib/logger";
import type { DriveFile } from "@/lib/types";
import { moveDriveFile, copyDriveFile } from "@/lib/google-drive/google-drive";
import type { ClipboardState } from "./types";

interface UseClipboardOperationsParams {
  accessToken: string | null;
  executeDriveCall: <T>(call: (token: string) => Promise<T>) => Promise<T>;
  refreshFiles: () => Promise<void>;
  currentFolderId: string | null;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setIsLoadingFiles: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setClipboard: (clipboard: ClipboardState | null) => void;
  clipboard: ClipboardState | null;
}

export function useClipboardOperations({
  accessToken,
  executeDriveCall,
  refreshFiles,
  currentFolderId,
  setSelectedIds,
  setIsLoadingFiles,
  setError,
  setClipboard,
  clipboard,
}: UseClipboardOperationsParams) {
  const moveItem = useCallback(
    (item: DriveFile, folderId: string) =>
      executeDriveCall((token) => moveDriveFile(token, item.id, folderId, item.parents?.[0])),
    [executeDriveCall]
  );

  /** Öğeleri sırayla işler; yükleme durumu, seçim temizliği ve yenileme burada. */
  const runTransfer = useCallback(
    async (
      failureLog: string,
      items: DriveFile[],
      transfer: (item: DriveFile) => Promise<unknown>,
      onTransferred?: () => void
    ) => {
      setIsLoadingFiles(true);
      setError(null);
      try {
        for (const item of items) await transfer(item);
        onTransferred?.();
        setSelectedIds(new Set());
        await refreshFiles();
      } catch (err) {
        logger.error(failureLog, err);
        throw err;
      } finally {
        setIsLoadingFiles(false);
      }
    },
    [refreshFiles, setError, setIsLoadingFiles, setSelectedIds]
  );

  const handlePaste = async () => {
    if (!clipboard?.items.length || !currentFolderId) return;
    const { action, items } = clipboard;

    const transfer =
      action === "copy"
        ? (item: DriveFile) =>
            executeDriveCall((token) => copyDriveFile(token, item.id, `${item.name} (copy)`, currentFolderId))
        : (item: DriveFile) => moveItem(item, currentFolderId);

    await runTransfer("Error pasting:", items, transfer, () => {
      if (action === "cut") setClipboard(null);
    });
  };

  const handleMoveToFolder = useCallback(
    async (targetFolderId: string, items: DriveFile[]) => {
      if (!accessToken || items.length === 0) return;
      const movable = items.filter((item) => item.id !== targetFolderId);
      await runTransfer("Move failed:", movable, (item) => moveItem(item, targetFolderId));
    },
    [accessToken, moveItem, runTransfer]
  );

  return {
    handlePaste,
    handleMoveToFolder,
  };
}
