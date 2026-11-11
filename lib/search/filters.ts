/**
 * Structural filter-chip matching, applied in-memory against the built index.
 * Pure boolean predicates — no I/O, no Drive calls.
 */

import type { IndexedItem } from "./index-builder";
import type { SearchChip } from "./types";

function matchesType(item: IndexedItem, fileType: string | undefined): boolean {
  if (!fileType) return true;
  if (fileType === "folder") return item.isFolder;
  if (fileType === "file") return !item.isFolder;
  return item.extension === fileType.toLowerCase();
}

function matchesDateRange(item: IndexedItem, from: number | undefined, to: number | undefined): boolean {
  if (from === undefined && to === undefined) return true;
  if (item.modifiedTimeMs === null) return false;
  if (from !== undefined && item.modifiedTimeMs < from) return false;
  if (to !== undefined && item.modifiedTimeMs >= to) return false;
  return true;
}

function matchesProperty(item: IndexedItem, propertyId: string | undefined, value: SearchChip["propertyValue"]): boolean {
  if (!propertyId) return true;
  const entry = item.properties.find((p) => p.id === propertyId);
  if (value === undefined) return Boolean(entry);
  if (!entry) return false;
  return entry.valueText.toLowerCase() === String(value).toLowerCase();
}

export function chipMatches(item: IndexedItem, chip: SearchChip): boolean {
  switch (chip.kind) {
    case "label":
      return chip.labelId ? item.labelIds.includes(chip.labelId) : true;
    case "type":
      return matchesType(item, chip.fileType);
    case "folder":
      return chip.folderId ? item.parentIds.includes(chip.folderId) : true;
    case "dateRange":
      return matchesDateRange(item, chip.dateFrom, chip.dateTo);
    case "property":
      return matchesProperty(item, chip.propertyId, chip.propertyValue);
    case "relatedFile":
      if (!chip.relatedFileId) return true;
      return (item.taggedItem?.relations ?? []).some((r) => r.targetFileId === chip.relatedFileId);
    case "owner":
      // No owner data available on DriveFile yet (org model is being rebuilt in
      // parallel). Documented gap — see docs/arama-v2.md. Chip is a no-op until
      // a caller wires ownership data through the engine's data model.
      return true;
    default:
      return true;
  }
}

export function itemMatchesAllChips(item: IndexedItem, chips: SearchChip[]): boolean {
  return chips.every((chip) => chipMatches(item, chip));
}
