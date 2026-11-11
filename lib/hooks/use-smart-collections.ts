/**
 * useSmartCollections — manages smart collections in the local store.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { applyFilters } from "@/lib/search/search-utils";
import { getLabelStore } from "@/lib/storage";
import type {
  DriveFile,
  SmartCollection,
  TaggedItem,
} from "@/lib/types";

export interface UseSmartCollectionsResult {
  collections: SmartCollection[];
  isLoading: boolean;
  saveCollection: (
    collection: Omit<SmartCollection, "id" | "createdAt" | "updatedAt"> & { id?: string }
  ) => Promise<SmartCollection>;
  deleteCollection: (id: string) => Promise<void>;
  getCollectionCount: (
    collection: SmartCollection,
    files: DriveFile[],
    taggedItems: Record<string, string[]>,
    itemMetadata: Record<string, TaggedItem>
  ) => number;
  refresh: () => void;
}

export function useSmartCollections(): UseSmartCollectionsResult {
  const [collections, setCollections] = useState<SmartCollection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const items = await getLabelStore().listCollections();
        if (cancelled) return;
        setCollections(items);
      } catch {
        if (!cancelled) setCollections([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  useEffect(
    () =>
      getLabelStore().subscribe((origin) => {
        if (origin === "sync") setReloadTick((n) => n + 1);
      }),
    []
  );

  const refresh = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  const saveCollection = useCallback(
    async (
      input: Omit<SmartCollection, "id" | "createdAt" | "updatedAt"> & { id?: string }
    ): Promise<SmartCollection> => {
      const saved = await getLabelStore().saveCollection(input);
      setCollections((prev) => {
        const idx = prev.findIndex((c) => c.id === saved.id);
        if (idx === -1) return [...prev, saved];
        const next = [...prev];
        next[idx] = { ...next[idx], ...saved };
        return next;
      });
      return saved;
    },
    []
  );

  const deleteCollection = useCallback(async (id: string) => {
    await getLabelStore().deleteCollection(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const getCollectionCount = useCallback(
    (
      collection: SmartCollection,
      files: DriveFile[],
      taggedItems: Record<string, string[]>,
      itemMetadata: Record<string, TaggedItem>
    ): number => {
      try {
        const combined: Record<
          string,
          { labels: string[]; properties: Record<string, string | number | boolean | string[]> }
        > = {};
        for (const [id, labels] of Object.entries(taggedItems)) {
          const meta = itemMetadata[id];
          combined[id] = {
            labels,
            properties: meta?.properties ?? {},
          };
        }
        const result = applyFilters(files, collection.filterGroup, combined);
        return result.length;
      } catch {
        return 0;
      }
    },
    []
  );

  return {
    collections,
    isLoading,
    saveCollection,
    deleteCollection,
    getCollectionCount,
    refresh,
  };
}
