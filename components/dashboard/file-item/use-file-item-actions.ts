"use client";

import { useCallback } from "react";
import { DriveFile, isFolder, shouldOpenInDrive } from "@/lib/google-drive/google-drive";
import type { FileItemActions, FileItemBaseProps } from "./types";

const FILE_DRAG_TYPE = "application/folderpls-files";

function readDraggedIds(transfer: DataTransfer): string[] {
  try {
    const parsed: unknown = JSON.parse(transfer.getData(FILE_DRAG_TYPE) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type ForwardedCallbacks = "onOpenFolder" | "onPreview" | "onSelect" | "onMoveToFolder" | "getDisplayedFiles";

interface UseFileItemActionsParams extends Pick<FileItemBaseProps, ForwardedCallbacks> {
  file: DriveFile;
  /** Herhangi bir öğe seçili mi (dokunmatikte dokunuş o zaman seçimi değiştirir). */
  selectionActive?: boolean;
  dragFileIds: string[];
  setDropTarget: (value: boolean) => void;
}

/**
 * Tıklama dokunuştan mı geldi? Tarayıcı click'i PointerEvent olarak veriyorsa
 * pointerType kesin bilgidir; vermiyorsa birincil işaretçinin kaba olup
 * olmadığına bakılır.
 */
function isTouchClick(e: React.MouseEvent): boolean {
  const pointerType = (e.nativeEvent as PointerEvent).pointerType;
  if (pointerType) return pointerType === "touch";
  return typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;
}

/**
 * Shared hook for file item interactions (click, keyboard, drag, drop)
 * Used by both FileItem (list view) and FileGridItem (grid view).
 *
 * Seçim modeli (panel spec §2.4): tek tık seçer; çift tık ya da Enter açar
 * (klasöre girer / önizler). Tek tık detay panelini AÇMAZ — panel View
 * menüsünden ya da `i` ile açılır ve açıkken seçimi izler.
 *
 * Dokunmatik (telefon/tablet): çift dokunuş keşfedilemez ve güvenilmez —
 * dokunuş AÇAR; seçim satırdaki kutuyla başlar, seçim sürerken dokunuş
 * seçimi açıp kapatır (Drive/Files uygulamalarındaki model).
 */
export function useFileItemActions({
  file,
  onOpenFolder,
  onPreview,
  onSelect,
  selectionActive = false,
  dragFileIds,
  onMoveToFolder,
  getDisplayedFiles,
  setDropTarget,
}: UseFileItemActionsParams): FileItemActions {
  /** Yalnız klasörler bırakma hedefidir. */
  const moveTarget = isFolder(file) ? onMoveToFolder : undefined;

  const handleDoubleClick = useCallback(() => {
    if (isFolder(file)) {
      onOpenFolder(file);
      return;
    }
    const driveUrl = shouldOpenInDrive(file) ? file.webViewLink : undefined;
    if (driveUrl) window.open(driveUrl, "_blank", "noopener,noreferrer");
    else onPreview(file);
  }, [file, onOpenFolder, onPreview]);

  const handleRowClick = useCallback((e: React.MouseEvent) => {
    const isAdditive = e.ctrlKey || e.metaKey || e.shiftKey;

    if (isTouchClick(e)) {
      if (onSelect && selectionActive) onSelect(file, true);
      else handleDoubleClick();
      return;
    }

    if (!onSelect) {
      if (isFolder(file)) onOpenFolder(file);
      return;
    }

    e.preventDefault();
    onSelect(file, isAdditive);
  }, [file, onSelect, onOpenFolder, selectionActive, handleDoubleClick]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return; // iç düğmeler kendi tuşlarını işler
    if (e.key === "Enter") {
      e.preventDefault();
      handleDoubleClick();
    } else if (e.key === " " && onSelect) {
      e.preventDefault();
      onSelect(file, true);
    }
  }, [file, onSelect, handleDoubleClick]);

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(file, true);
  }, [file, onSelect]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!dragFileIds.length) return;
    const { dataTransfer } = e;
    dataTransfer.effectAllowed = "move";
    dataTransfer.setData(FILE_DRAG_TYPE, JSON.stringify(dragFileIds));
    // Visual "lifted" state on the source item (CSS: [data-dragging]).
    e.currentTarget.setAttribute("data-dragging", "");
  }, [dragFileIds]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    e.currentTarget.removeAttribute("data-dragging");
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!moveTarget || !e.dataTransfer.types.includes(FILE_DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(true);
  }, [moveTarget, setDropTarget]);

  const handleDragLeave = useCallback(() => {
    setDropTarget(false);
  }, [setDropTarget]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    setDropTarget(false);
    if (!moveTarget) return;
    e.preventDefault();

    const draggedIds = new Set(readDraggedIds(e.dataTransfer));
    if (draggedIds.has(file.id) || !getDisplayedFiles) return;
    const moving = getDisplayedFiles().filter((candidate) => draggedIds.has(candidate.id));
    if (moving.length > 0) moveTarget(file.id, moving);
  }, [file.id, moveTarget, getDisplayedFiles, setDropTarget]);

  return {
    handleDoubleClick,
    handleRowClick,
    handleCheckboxClick,
    handleKeyDown,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
