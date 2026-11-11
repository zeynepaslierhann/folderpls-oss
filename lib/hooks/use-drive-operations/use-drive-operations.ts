"use client";

import { useFolderOperations } from "./use-folder-operations";
import { useUploadOperations } from "./use-upload-operations";
import { useLabelOperations } from "./use-label-operations";
import { useFileOperations } from "./use-file-operations";
import { useClipboardOperations } from "./use-clipboard-operations";
import type { UseDriveOperationsParams, UseDriveOperationsReturn } from "./types";

/**
 * Main hook for Google Drive operations
 * Composes smaller specialized hooks for better maintainability
 */
export function useDriveOperations(params: UseDriveOperationsParams): UseDriveOperationsReturn {
  const {
    labelStore,
    accessToken,
    executeDriveCall,
    refreshFiles,
    currentFolderId,
    viewMode,
    taggedItems,
    setTaggedItems,
    itemMetadata,
    setItemMetadata,
    taggedItemsTypes,
    setTaggedItemsTypes,
    setUserLabels,
    setIsLoadingFiles,
    setError,
    getSafeMessage,
    t,
    selectedIds,
    setSelectedIds,
    getSelectedFiles,
    getDisplayedFiles,
    setDeleteConfirmOpen,
    setDeleteConfirmItems,
    deleteConfirmItems,
    setIsRenaming,
    setRenameFile,
    setIsUploading,
    setClipboard,
    clipboard,
  } = params;

  // Folder operations
  const { handleCreateFolder } = useFolderOperations({
    labelStore,
    executeDriveCall,
    refreshFiles,
    currentFolderId,
    setTaggedItems,
    setItemMetadata,
    setTaggedItemsTypes,
    setUserLabels,
    setIsLoadingFiles,
    setError,
  });

  // Upload operations
  const { handleUploadWithLabels } = useUploadOperations({
    labelStore,
    executeDriveCall,
    refreshFiles,
    currentFolderId,
    setTaggedItems,
    setItemMetadata,
    setTaggedItemsTypes,
    setUserLabels,
    setError,
    setIsUploading,
    t,
  });

  // Label operations
  const { handleUpdateLabels, handleSaveLabels, handleBulkAddLabels } = useLabelOperations({
    labelStore,
    taggedItems,
    setTaggedItems,
    itemMetadata,
    setItemMetadata,
    taggedItemsTypes,
    setTaggedItemsTypes,
    setUserLabels,
    setSelectedIds,
    getDisplayedFiles,
  });

  // File operations
  const { handleRename, handleDeleteRequest, handleDeleteConfirm, handleDownload } = useFileOperations({
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
  });

  // Clipboard operations
  const { handlePaste, handleMoveToFolder } = useClipboardOperations({
    accessToken,
    executeDriveCall,
    refreshFiles,
    currentFolderId,
    setSelectedIds,
    setIsLoadingFiles,
    setError,
    setClipboard,
    clipboard,
  });

  return {
    handleCreateFolder,
    handleUploadWithLabels,
    handleUpdateLabels,
    handleSaveLabels,
    handleRename,
    handleDeleteRequest,
    handleDeleteConfirm,
    handleDownload,
    handlePaste,
    handleMoveToFolder,
    handleBulkAddLabels,
  };
}
