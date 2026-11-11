/**
 * Adapter between the new structured `SearchQuery` (free text + chips) and
 * the legacy `FilterGroup` that `SmartCollection` persists to the label store.
 *
 * This keeps "save this search as a collection" backward compatible: a
 * collection saved from search v2 is applied later by the untouched
 * `applyFilters` in lib/search/search-utils.ts, same as collections saved
 * before this rebuild.
 *
 * Known gaps (legacy `FilterGroup` can't express these; documented, not a
 * silent bug):
 *  - `type` chips for a specific extension (e.g. "pdf") — the legacy `type`
 *    field only supports folder/file, so extension chips are dropped here.
 *  - `relatedFile` / `owner` chips have no legacy field at all yet.
 */

import type { FilterCondition, FilterGroup, PropertyDefinition } from "@/lib/types";
import type { SearchChip, SearchQuery } from "./types";

function conditionId(prefix: string, i: number): string {
  return `cond_${Date.now()}_${prefix}_${i}`;
}

/**
 * `SearchChip.propertyValue` carries the human-readable value (e.g. "Taslak"),
 * but `applyFilters` compares against the *raw stored* value — which for
 * select/status/multi-select properties is the option id, not its display
 * name (see components/dashboard/file-details-panel/properties-tab.tsx).
 * Resolve display name -> option id here so saved collections actually match.
 */
function resolvePropertyRawValue(
  def: PropertyDefinition | undefined,
  displayValue: string | number | boolean
): { operator: "equals" | "contains"; value: string | number | boolean | string[] } {
  if (!def) return { operator: "equals", value: displayValue };
  if (def.type === "select" || def.type === "status") {
    const option = def.options?.find((o) => o.name.toLowerCase() === String(displayValue).toLowerCase());
    return { operator: "equals", value: option?.id ?? displayValue };
  }
  if (def.type === "multi-select") {
    const option = def.options?.find((o) => o.name.toLowerCase() === String(displayValue).toLowerCase());
    return { operator: "contains", value: [option?.id ?? String(displayValue)] };
  }
  return { operator: "equals", value: displayValue };
}

function chipToConditions(chip: SearchChip, i: number, properties: PropertyDefinition[]): FilterCondition[] {
  switch (chip.kind) {
    case "label":
      if (!chip.labelId) return [];
      return [
        {
          id: conditionId("label", i),
          fieldType: "label",
          operator: "has_label",
          value: chip.labelId,
        },
      ];
    case "type":
      if (chip.fileType !== "folder" && chip.fileType !== "file") return [];
      return [
        {
          id: conditionId("type", i),
          fieldType: "type",
          operator: "equals",
          value: chip.fileType,
        },
      ];
    case "property": {
      if (!chip.propertyId || chip.propertyValue === undefined) return [];
      const def = properties.find((p) => p.id === chip.propertyId);
      const resolved = resolvePropertyRawValue(def, chip.propertyValue);
      return [
        {
          id: conditionId("property", i),
          fieldType: "property",
          fieldId: chip.propertyId,
          operator: resolved.operator,
          value: resolved.value,
        },
      ];
    }
    case "dateRange": {
      const conditions: FilterCondition[] = [];
      if (chip.dateFrom !== undefined) {
        conditions.push({
          id: conditionId("date-from", i),
          fieldType: "date_modified",
          operator: "after",
          value: new Date(chip.dateFrom),
        });
      }
      if (chip.dateTo !== undefined) {
        conditions.push({
          id: conditionId("date-to", i),
          fieldType: "date_modified",
          operator: "before",
          value: new Date(chip.dateTo),
        });
      }
      return conditions;
    }
    // No legacy field for these yet — dropped, not silently mismapped.
    case "folder":
    case "relatedFile":
    case "owner":
    default:
      return [];
  }
}

/**
 * Build a legacy `FilterGroup` from a v2 search query, for SmartCollection persistence.
 * `properties` is only needed to resolve select/status/multi-select display values back
 * to their raw stored option ids; pass `[]` if the query has no property chips.
 */
export function queryToFilterGroup(query: SearchQuery, properties: PropertyDefinition[] = []): FilterGroup {
  const conditions: FilterCondition[] = [];
  const text = query.text.trim();
  if (text) {
    conditions.push({
      id: conditionId("name", 0),
      fieldType: "name",
      operator: "contains",
      value: text,
    });
  }
  query.chips.forEach((chip, i) => {
    conditions.push(...chipToConditions(chip, i, properties));
  });
  return { logic: "and", conditions };
}
