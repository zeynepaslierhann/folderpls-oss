"use client";

import { useState, useCallback } from "react";
import { toggleId, useNewLabelDraft, type NewLabel } from "@/lib/hooks/use-planned-content";

interface UseLabelSelectionOptions {
  initialSelectedIds?: string[];
  initialNewLabels?: NewLabel[];
}

export function useLabelSelection(options: UseLabelSelectionOptions = {}) {
  const { initialSelectedIds = [], initialNewLabels = [] } = options;

  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(initialSelectedIds);
  const [searchQuery, setSearchQuery] = useState("");
  const draft = useNewLabelDraft(initialNewLabels);
  const clearDraft = draft.clear;

  const toggleLabel = useCallback((labelId: string) => {
    setSelectedLabelIds((current) => toggleId(current, labelId));
  }, []);

  const reset = useCallback((newSelectedIds: string[] = []) => {
    setSelectedLabelIds(newSelectedIds);
    setSearchQuery("");
    clearDraft();
  }, [clearDraft]);

  return {
    // State
    selectedLabelIds,
    newLabelsToCreate: draft.labels,
    newLabelName: draft.name,
    newLabelColor: draft.color,
    isCreatingNew: draft.composing,
    searchQuery,

    // Setters
    setSelectedLabelIds,
    setNewLabelName: draft.setName,
    setNewLabelColor: draft.setColor,
    setIsCreatingNew: draft.setComposing,
    setSearchQuery,

    // Actions
    toggleLabel,
    addNewLabel: draft.commit,
    removeNewLabel: draft.discard,
    reset,
  };
}
