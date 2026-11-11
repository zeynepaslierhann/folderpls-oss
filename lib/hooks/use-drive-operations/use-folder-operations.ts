"use client";

import { logger } from "@/lib/logger";
import type { LabelItem, TaggedItem } from "@/lib/types";
import type { LabelStore } from "@/lib/storage";
import { createDriveFolder } from "@/lib/google-drive/google-drive";
import { createLabelsInStore, buildLabelExpiries } from "./helpers";
import { mergeLabelIds, withEntry } from "./bulk-labels";
import type { CreateFolderOptions } from "./types";

interface UseFolderOperationsParams {
  labelStore: LabelStore;
  executeDriveCall: <T>(call: (token: string) => Promise<T>) => Promise<T>;
  refreshFiles: () => Promise<void>;
  currentFolderId: string | null;
  setTaggedItems: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setItemMetadata: React.Dispatch<React.SetStateAction<Record<string, TaggedItem>>>;
  setTaggedItemsTypes: React.Dispatch<React.SetStateAction<Record<string, "file" | "folder">>>;
  setUserLabels: React.Dispatch<React.SetStateAction<LabelItem[]>>;
  setIsLoadingFiles: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export function useFolderOperations({
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
}: UseFolderOperationsParams) {
  const addLabelToState = (label: LabelItem) => {
    setUserLabels((prev) => [...prev, label]);
  };

  const handleCreateFolder = async (name: string, options: CreateFolderOptions) => {
    setIsLoadingFiles(true);
    setError(null);

    const createAndTag = async () => {
      const parentFolderId = currentFolderId || undefined;
      const created = await executeDriveCall((token) => createDriveFolder(token, name, parentFolderId));

      const { labelIds = [], newLabels = [], plannedLabelIds = [], plannedNewLabels = [] } = options;
      const hasLabels = labelIds.length > 0 || newLabels.length > 0 || plannedLabelIds.length > 0 || plannedNewLabels.length > 0;

      if (hasLabels && created.id) {
        const createdLabelIds = await createLabelsInStore(labelStore, newLabels, addLabelToState);
        const createdPlannedLabelIds = await createLabelsInStore(labelStore, plannedNewLabels, addLabelToState);

        const allPlannedIds = plannedLabelIds.concat(createdPlannedLabelIds);
        const merged = mergeLabelIds([...labelIds, ...createdLabelIds], allPlannedIds);
        const labelExpiries = buildLabelExpiries(allPlannedIds, options.plannedExpiresAt);

        const newItemPayload: Partial<TaggedItem> & { itemId: string; name: string; type: "folder"; labels: string[]; labelExpiries?: Record<string, number> } = {
          itemId: created.id,
          name: created.name,
          type: "folder",
          labels: merged,
        };

        if (Object.keys(labelExpiries).length > 0) {
          newItemPayload.labelExpiries = labelExpiries;
        }

        await labelStore.tagItem(newItemPayload);

        setTaggedItems(withEntry(created.id, merged));
        setItemMetadata((prev) => ({
          ...prev,
          [created.id]: {
            ...newItemPayload,
            type: "folder",
            addedAt: new Date(),
            updatedAt: new Date(),
            properties: {},
            notes: [],
            relations: [],
          } as TaggedItem,
        }));
        setTaggedItemsTypes(withEntry<"file" | "folder">(created.id, "folder"));
      }

      await refreshFiles();
    };

    await createAndTag()
      .catch((err) => {
        logger.error("Error creating folder:", err);
        throw err;
      })
      .finally(() => setIsLoadingFiles(false));
  };

  return { handleCreateFolder };
}
