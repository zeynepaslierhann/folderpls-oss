"use client";

import { useState, useCallback } from "react";
import { PRESET_COLORS, getRandomPresetColor } from "@/lib/constants";
import type { PlannedLabelOptions } from "@/lib/hooks/use-drive-operations/types";
import type { LabelItem } from "@/lib/types";

export type NewLabel = Omit<LabelItem, "id">;

/** `id` listedeyse çıkarır, değilse sona ekler. */
export function toggleId(ids: string[], id: string): string[] {
  const remaining = ids.filter((existing) => existing !== id);
  return remaining.length === ids.length ? [...ids, id] : remaining;
}

/** Diyaloglarda oluşturulmayı bekleyen etiketler ve açık "yeni etiket" formu. */
export function useNewLabelDraft(initialLabels: NewLabel[] = []) {
  const [labels, setLabels] = useState(initialLabels);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [composing, setComposing] = useState(false);

  const commit = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setLabels((current) => [...current, { name: trimmedName, color }]);
    setName("");
    setColor(getRandomPresetColor());
    setComposing(false);
  }, [name, color]);

  const discard = useCallback((index: number) => {
    setLabels((current) => current.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => {
    setLabels([]);
    setName("");
    setColor(PRESET_COLORS[0]);
    setComposing(false);
  }, []);

  return { labels, name, color, composing, setName, setColor, setComposing, commit, discard, clear };
}

export interface UsePlannedContentReturn {
  // State
  enabled: boolean;
  labelIds: string[];
  newLabels: NewLabel[];
  expiresDate: string;
  expiresTime: string;
  isCreatingLabel: boolean;
  newLabelName: string;
  newLabelColor: string;
  hasError: boolean;

  // Actions
  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  toggleLabel: (labelId: string) => void;
  addNewLabel: () => void;
  removeNewLabel: (index: number) => void;
  setExpiresDate: (date: string) => void;
  setExpiresTime: (time: string) => void;
  setIsCreatingLabel: (creating: boolean) => void;
  setNewLabelName: (name: string) => void;
  setNewLabelColor: (color: string) => void;
  setHasError: (error: boolean) => void;

  // Computed
  getExpiresAt: () => number | undefined;
  validate: () => boolean;
  reset: () => void;

  // For form submission
  getPlannedContentData: () => PlannedLabelOptions;
}

/**
 * Hook for managing planned content state in dialogs
 * Used by upload-dialog, create-folder-dialog, and label-dialog
 */
export function usePlannedContent(): UsePlannedContentReturn {
  const [enabled, setEnabled] = useState(false);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [expiresDate, setExpiresDate] = useState("");
  const [expiresTime, setExpiresTime] = useState("");
  const [hasError, setHasError] = useState(false);
  const draft = useNewLabelDraft();
  const { labels: newLabels, clear: clearDraft } = draft;

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  const toggleLabel = useCallback((labelId: string) => {
    setLabelIds((current) => toggleId(current, labelId));
  }, []);

  const getExpiresAt = useCallback((): number | undefined => {
    if (!enabled || !expiresDate || !expiresTime) return undefined;
    return new Date(`${expiresDate}T${expiresTime}`).getTime();
  }, [enabled, expiresDate, expiresTime]);

  const validate = useCallback((): boolean => {
    // If planned content is enabled and has labels but no expiry, return false
    if (enabled && (labelIds.length > 0 || newLabels.length > 0)) {
      const expiresAt = getExpiresAt();
      if (!expiresAt) {
        setHasError(true);
        return false;
      }
    }
    setHasError(false);
    return true;
  }, [enabled, labelIds, newLabels, getExpiresAt]);

  const reset = useCallback(() => {
    setEnabled(false);
    setLabelIds([]);
    setExpiresDate("");
    setExpiresTime("");
    setHasError(false);
    clearDraft();
  }, [clearDraft]);

  const getPlannedContentData = useCallback(() => {
    if (!enabled) return {};

    const expiresAt = getExpiresAt();
    return {
      plannedLabelIds: labelIds.length > 0 ? labelIds : undefined,
      plannedNewLabels: newLabels.length > 0 ? newLabels : undefined,
      plannedExpiresAt: expiresAt,
    };
  }, [enabled, labelIds, newLabels, getExpiresAt]);

  return {
    // State
    enabled,
    labelIds,
    newLabels,
    expiresDate,
    expiresTime,
    isCreatingLabel: draft.composing,
    newLabelName: draft.name,
    newLabelColor: draft.color,
    hasError,

    // Actions
    setEnabled,
    toggleEnabled,
    toggleLabel,
    addNewLabel: draft.commit,
    removeNewLabel: draft.discard,
    setExpiresDate,
    setExpiresTime,
    setIsCreatingLabel: draft.setComposing,
    setNewLabelName: draft.setName,
    setNewLabelColor: draft.setColor,
    setHasError,

    // Computed
    getExpiresAt,
    validate,
    reset,
    getPlannedContentData,
  };
}
