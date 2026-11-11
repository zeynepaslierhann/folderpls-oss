"use client";

import { logger } from "@/lib/logger";
import type { LabelItem, TaggedItem } from "@/lib/types";
import type { LabelStore } from "@/lib/storage";
import {
  createDriveFolder,
  uploadDriveFile,
  getDriveStorageQuota,
} from "@/lib/google-drive/google-drive";
import { createLabelsInStore, buildLabelExpiries } from "./helpers";
import { withEntry } from "./bulk-labels";
import type { UseDriveOperationsReturn } from "./types";

/** "a/b/c.txt" için "a/b"; klasörsüz yol için boş metin. */
function parentDirOf(relativePath = ""): string {
  return relativePath.slice(0, Math.max(relativePath.lastIndexOf("/"), 0));
}

/**
 * Göreli klasör yollarını Drive klasör kimliğine çevirir; eksik ara klasörleri
 * bir kez oluşturur. Kök klasör bilinmiyorsa yol kökte sayılır (undefined).
 */
function createFolderResolver(
  rootId: string | undefined,
  makeFolder: (name: string, parentId: string) => Promise<string>
) {
  const knownFolders = new Map<string, string>();

  const ensureFolder = async (path: string): Promise<string | undefined> => {
    if (!path) return rootId;
    const known = knownFolders.get(path);
    if (known) return known;

    const parentId = await ensureFolder(parentDirOf(path));
    if (!parentId) return undefined;

    const folderId = await makeFolder(path.slice(path.lastIndexOf("/") + 1), parentId);
    knownFolders.set(path, folderId);
    return folderId;
  };

  return (dirPath: string) => ensureFolder(dirPath.split("/").filter(Boolean).join("/"));
}

interface UseUploadOperationsParams {
  labelStore: LabelStore;
  executeDriveCall: <T>(call: (token: string) => Promise<T>) => Promise<T>;
  refreshFiles: () => Promise<void>;
  currentFolderId: string | null;
  setTaggedItems: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setItemMetadata: React.Dispatch<React.SetStateAction<Record<string, TaggedItem>>>;
  setTaggedItemsTypes: React.Dispatch<React.SetStateAction<Record<string, "file" | "folder">>>;
  setUserLabels: React.Dispatch<React.SetStateAction<LabelItem[]>>;
  setError: (error: string | null) => void;
  setIsUploading: (uploading: boolean) => void;
  t: (key: string) => string;
}

export function useUploadOperations({
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
}: UseUploadOperationsParams) {
  const addLabelToState = (label: LabelItem) => {
    setUserLabels((prev) => [...prev, label]);
  };

  const hasRoomFor = (files: File[]): Promise<boolean> => {
    const incomingBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
    return executeDriveCall(getDriveStorageQuota).then(
      ({ limit, usage }) => limit == null || usage + incomingBytes <= limit,
      (quotaError) => {
        logger.warn("Drive quota lookup failed, uploading without a space check:", quotaError);
        return true;
      }
    );
  };

  const handleUploadWithLabels: UseDriveOperationsReturn["handleUploadWithLabels"] = async (files, options, filePaths) => {
    if (files.length === 0) return;
    setError(null);

    // Check quota
    if (!(await hasRoomFor(files))) {
      setError(t("dashboard.uploadNoSpace"));
      return;
    }

    setIsUploading(true);
    const resolveFolder = createFolderResolver(currentFolderId || undefined, async (name, parentId) => {
      const folder = await executeDriveCall((token) => createDriveFolder(token, name, parentId));
      return folder.id;
    });

    const uploadAndTag = async () => {
      const createdLabelIds = await createLabelsInStore(labelStore, options.newLabels, addLabelToState);
      const createdPlannedLabelIds = await createLabelsInStore(labelStore, options.plannedNewLabels || [], addLabelToState);

      const plannedLabelIds = [...(options.plannedLabelIds || []), ...createdPlannedLabelIds];
      const labelExpiries = buildLabelExpiries(plannedLabelIds, options.plannedExpiresAt);
      const finalLabelIds = options.labelIds.concat(createdLabelIds, plannedLabelIds);
      const shouldTag = finalLabelIds.length > 0 || Object.keys(labelExpiries).length > 0;

      for (const [index, file] of files.entries()) {
        const targetFolderId = await resolveFolder(parentDirOf(filePaths?.[index]));
        const uploaded = await executeDriveCall((token) => uploadDriveFile(token, file, targetFolderId));
        options.onProgress?.(Math.round(((index + 1) / files.length) * 100));

        if (shouldTag) {
          const newItemPayload: Partial<TaggedItem> & { itemId: string; name: string; type: "file"; labels: string[]; labelExpiries?: Record<string, number> } = {
            itemId: uploaded.id,
            name: uploaded.name,
            type: "file",
            labels: finalLabelIds,
          };

          if (Object.keys(labelExpiries).length > 0) {
            newItemPayload.labelExpiries = labelExpiries;
          }

          await labelStore.tagItem(newItemPayload);

          setTaggedItems(withEntry(uploaded.id, finalLabelIds));
          setItemMetadata((prev) => ({
            ...prev,
            [uploaded.id]: {
              ...newItemPayload,
              type: "file",
              addedAt: new Date(),
              updatedAt: new Date(),
              properties: {},
              notes: [],
              relations: [],
            } as TaggedItem,
          }));
          setTaggedItemsTypes(withEntry<"file" | "folder">(uploaded.id, "file"));
        }
      }

      await refreshFiles();
    };

    await uploadAndTag()
      .catch((err) => {
        logger.error("Error uploading files:", err);
        throw err;
      })
      .finally(() => setIsUploading(false));
  };

  return { handleUploadWithLabels };
}
