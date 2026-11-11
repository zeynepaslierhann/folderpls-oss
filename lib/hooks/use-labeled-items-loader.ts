"use client";

import { useState, useEffect, useCallback } from "react";
import { getLabelStore, type LabelStore } from "@/lib/storage";
import type { LabelItem, TaggedItem, PropertyDefinition } from "@/lib/types";
import { logger } from "@/lib/logger";

export interface LabeledItemsState {
  userLabels: LabelItem[];
  taggedItems: Record<string, string[]>;
  itemMetadata: Record<string, TaggedItem>;
  taggedItemsTypes: Record<string, "file" | "folder">;
  propertyDefinitions: PropertyDefinition[];
  setUserLabels: React.Dispatch<React.SetStateAction<LabelItem[]>>;
  setTaggedItems: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setItemMetadata: React.Dispatch<React.SetStateAction<Record<string, TaggedItem>>>;
  setTaggedItemsTypes: React.Dispatch<React.SetStateAction<Record<string, "file" | "folder">>>;
  setPropertyDefinitions: React.Dispatch<React.SetStateAction<PropertyDefinition[]>>;
  /** Re-read tagged items from the local store */
  reload: () => void;
}

function hasAttachedContent(item: TaggedItem): boolean {
  return Boolean(item.notes?.length || item.relations?.length || Object.keys(item.properties ?? {}).length);
}

/** Süresi dolan etiketleri ayıklar; ekrana gidecek haritaları ve yeniden yazılacak öğeleri verir. */
function reconcileLabelExpiries(allItems: Record<string, TaggedItem>, now: number) {
  const visible = {
    tags: {} as Record<string, string[]>,
    meta: {} as Record<string, TaggedItem>,
    types: {} as Record<string, "file" | "folder">,
  };
  const staleItems: TaggedItem[] = [];

  for (const [itemId, item] of Object.entries(allItems)) {
    const assigned = item.labels || [];
    const expiries = item.labelExpiries || {};
    const liveLabels = assigned.filter((labelId) => !expiries[labelId] || expiries[labelId] >= now);
    const lostLabels = liveLabels.length < assigned.length;

    let record = item;
    if (lostLabels) {
      const liveExpiries = Object.fromEntries(
        Object.entries(expiries).filter(([labelId, at]) => at && liveLabels.includes(labelId))
      );
      record = {
        ...item,
        itemId,
        labels: liveLabels,
        labelExpiries: Object.keys(liveExpiries).length > 0 ? liveExpiries : undefined,
      };
      staleItems.push(record);
    }

    if (lostLabels || liveLabels.length > 0 || hasAttachedContent(item)) {
      visible.tags[itemId] = liveLabels;
      visible.meta[itemId] = record;
      visible.types[itemId] = item.type || "file";
    }
  }

  return { visible, staleItems };
}

/**
 * Loads labels, property definitions and tagged item metadata from the local
 * store. Handles label expiry cleanup automatically.
 */
export function useLabeledItemsLoader(): LabeledItemsState {
  const [userLabels, setUserLabels] = useState<LabelItem[]>([]);
  const [taggedItems, setTaggedItems] = useState<Record<string, string[]>>({});
  const [itemMetadata, setItemMetadata] = useState<Record<string, TaggedItem>>({});
  const [taggedItemsTypes, setTaggedItemsTypes] = useState<Record<string, "file" | "folder">>({});
  const [propertyDefinitions, setPropertyDefinitions] = useState<PropertyDefinition[]>([]);
  const [reloadTick, setReloadTick] = useState(0);

  const applyTaggedItems = useCallback(
    async (allItems: Record<string, TaggedItem>, store: LabelStore) => {
      const { visible, staleItems } = reconcileLabelExpiries(allItems, Date.now());

      setTaggedItems(visible.tags);
      setItemMetadata(visible.meta);
      setTaggedItemsTypes(visible.types);

      if (staleItems.length > 0) {
        await Promise.all(staleItems.map((item) => store.tagItem(item)));
      }
    },
    []
  );

  useEffect(() => {
    const store = getLabelStore();

    const load = async () => {
      try {
        const definitions = await store.loadDefinitions();
        setUserLabels(definitions.labels);
        setPropertyDefinitions(definitions.propertyDefinitions);
      } catch (err) {
        logger.error("useLabeledItemsLoader: Error loading definitions:", err);
      }

      try {
        await applyTaggedItems(await store.listTaggedItems(), store);
      } catch (err) {
        logger.error("useLabeledItemsLoader: Tagged items load failed:", err);
        await applyTaggedItems({}, store);
      }
    };

    load();
  }, [reloadTick, applyTaggedItems]);

  // Drive yedeğinden gelen değişiklik ekrana yansısın; yerel yazmalar zaten durumda.
  useEffect(
    () =>
      getLabelStore().subscribe((origin) => {
        if (origin === "sync") setReloadTick((t) => t + 1);
      }),
    []
  );

  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  return {
    userLabels,
    taggedItems,
    itemMetadata,
    taggedItemsTypes,
    propertyDefinitions,
    setUserLabels,
    setTaggedItems,
    setItemMetadata,
    setTaggedItemsTypes,
    setPropertyDefinitions,
    reload,
  };
}
