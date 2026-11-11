import type { LabelItem } from "@/lib/types";
import type { LabelStore } from "@/lib/storage";
import { generateLabelId } from "@/lib/utils/id-generator";

/**
 * Creates new labels in the store and returns the created label IDs
 */
export async function createLabelsInStore(
  store: LabelStore,
  labels: Omit<LabelItem, "id">[],
  onLabelCreated?: (label: LabelItem) => void
): Promise<string[]> {
  const createdLabelIds: string[] = [];

  for (const label of labels) {
    const labelId = generateLabelId();
    await store.createLabel({ id: labelId, name: label.name, color: label.color });
    createdLabelIds.push(labelId);
    onLabelCreated?.({ id: labelId, ...label });
  }

  return createdLabelIds;
}

/**
 * Builds label expiry map for planned labels
 */
export function buildLabelExpiries(
  plannedLabelIds: string[],
  expiresAt?: number
): Record<string, number> {
  if (!expiresAt || plannedLabelIds.length === 0) return {};

  const expiries: Record<string, number> = {};
  plannedLabelIds.forEach((id) => {
    expiries[id] = expiresAt;
  });
  return expiries;
}
