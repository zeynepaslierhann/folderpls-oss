"use client";

import { logger } from "@/lib/logger";
import type { LabelItem, TaggedItem, DriveFile } from "@/lib/types";
import { isFolder } from "@/lib/google-drive/google-drive";
import type { LabelStore } from "@/lib/storage";
import { createLabelsInStore } from "./helpers";
import { applyLabelsToFiles, nextItemMetadata, withEntry } from "./bulk-labels";
import type { UseDriveOperationsReturn } from "./types";

async function logged<T>(failureLog: string, work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err) {
    logger.error(failureLog, err);
    throw err;
  }
}

/** Silinen etiketleri öğelerden düşürür; etiketi ve özelliği kalmayan öğe kayıtlardan çıkar. */
function withoutDeletedLabels(
  tags: Record<string, string[]>,
  types: Record<string, "file" | "folder">,
  metadata: Record<string, TaggedItem>,
  deletedLabelIds: string[]
) {
  const deleted = new Set(deletedLabelIds);
  const nextTags: typeof tags = {};
  const nextTypes = { ...types };
  const nextMetadata = { ...metadata };

  for (const [itemId, labelIds] of Object.entries(tags)) {
    const kept = labelIds.filter((labelId) => !deleted.has(labelId));
    const existing = metadata[itemId];
    const refreshed = existing && { ...existing, labels: kept, updatedAt: new Date() };

    if (kept.length > 0 || Object.keys(refreshed?.properties ?? {}).length > 0) {
      nextTags[itemId] = kept;
      if (refreshed) nextMetadata[itemId] = refreshed;
    } else {
      delete nextTypes[itemId];
      delete nextMetadata[itemId];
    }
  }

  return { tags: nextTags, types: nextTypes, metadata: nextMetadata };
}

interface UseLabelOperationsParams {
  labelStore: LabelStore;
  taggedItems: Record<string, string[]>;
  setTaggedItems: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  itemMetadata: Record<string, TaggedItem>;
  setItemMetadata: React.Dispatch<React.SetStateAction<Record<string, TaggedItem>>>;
  taggedItemsTypes: Record<string, "file" | "folder">;
  setTaggedItemsTypes: React.Dispatch<React.SetStateAction<Record<string, "file" | "folder">>>;
  setUserLabels: React.Dispatch<React.SetStateAction<LabelItem[]>>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  getDisplayedFiles: () => DriveFile[];
  /** Kullanıcının ilk etiketi uygulandığında (aktivasyon olayı) çağrılır; yoksa yok sayılır. */
}

export function useLabelOperations({
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
}: UseLabelOperationsParams) {
  const addLabelToState = (label: LabelItem) => {
    setUserLabels((prev) => [...prev, label]);
  };

  const handleUpdateLabels: UseDriveOperationsReturn["handleUpdateLabels"] = (updatedLabels, deletedLabelIds) =>
    logged("Error updating labels:", async () => {
      await labelStore.updateLabels(updatedLabels, deletedLabelIds);
      setUserLabels(updatedLabels);

      const pruned = withoutDeletedLabels(taggedItems, taggedItemsTypes, itemMetadata, deletedLabelIds);
      setTaggedItems(pruned.tags);
      setItemMetadata(pruned.metadata);
      setTaggedItemsTypes(pruned.types);
    });

  const handleSaveLabels: UseDriveOperationsReturn["handleSaveLabels"] = (fileId, selectedLabelIds, newLabels, options) =>
    logged("Error saving labels:", async () => {
      const createdLabelIds = await createLabelsInStore(labelStore, newLabels, addLabelToState);
      const labels = selectedLabelIds.concat(createdLabelIds);
      const file = getDisplayedFiles().find(({ id }) => id === fileId);
      const kind: "file" | "folder" = file && isFolder(file) ? "folder" : "file";

      const previousMeta = itemMetadata[fileId] || {};
      const itemPayload = {
        ...previousMeta,
        itemId: fileId,
        name: file?.name || previousMeta.name || "",
        type: kind,
        labels,
        labelExpiries: options?.labelExpiries || previousMeta.labelExpiries,
      };
      await labelStore.tagItem(itemPayload);

      setTaggedItems(withEntry(fileId, labels));
      setItemMetadata((prev) => ({
        ...prev,
        [fileId]: { ...itemPayload, updatedAt: new Date() } as TaggedItem,
      }));
      if (file) setTaggedItemsTypes(withEntry<"file" | "folder">(fileId, kind));
    });

  const handleBulkAddLabels: UseDriveOperationsReturn["handleBulkAddLabels"] = async (fileIds, labelIds, newLabels) => {
    if (fileIds.length === 0) return { failedIds: [], createdLabelIds: [] };

    return logged("Error saving bulk labels:", async () => {
      const createdLabelIds = await createLabelsInStore(labelStore, newLabels, addLabelToState);
      const allLabelIds = [...labelIds, ...createdLabelIds];
      const files = getDisplayedFiles();

      // tagItem: kaydı yoksa oluşturur, varsa günceller (updateItemLabels hiç etiketlenmemiş
      // dosyada "No document to update" ile düşüyordu).
      const { succeeded, failedIds } = await applyLabelsToFiles(fileIds, files, taggedItems, allLabelIds, async (file, merged) => {
        const payload = {
          itemId: file.id,
          name: file.name,
          type: (isFolder(file) ? "folder" : "file") as "file" | "folder",
          labels: merged,
        };
        await labelStore.tagItem(payload);
      });

      if (succeeded.length > 0) {
        setTaggedItems((prev) => {
          const next = { ...prev };
          succeeded.forEach(({ file, merged }) => { next[file.id] = merged; });
          return next;
        });
        setItemMetadata((prev) => {
          const next = { ...prev };
          succeeded.forEach(({ file, merged }) => {
            next[file.id] = nextItemMetadata(prev[file.id], file, isFolder(file) ? "folder" : "file", merged);
          });
          return next;
        });
        setTaggedItemsTypes((prev) => {
          const next = { ...prev };
          succeeded.forEach(({ file }) => { next[file.id] = isFolder(file) ? "folder" : "file"; });
          return next;
        });
      }

      // Başarısızlar seçili kalır: kullanıcı yalnız onları yeniden dener.
      setSelectedIds(new Set(failedIds));
      return { failedIds, createdLabelIds };
    });
  };

  return {
    handleUpdateLabels,
    handleSaveLabels,
    handleBulkAddLabels,
  };
}
