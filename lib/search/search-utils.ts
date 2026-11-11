// Re-export types from centralized location for backward compatibility
export type {
  FilterGroup,
} from "@/lib/types";

// Import types for internal use
import type {
  DriveFile,
  PropertyDefinition,
  FilterOperator,
  FilterFieldType,
  FilterCondition,
  FilterGroup,
} from "@/lib/types";

// Import centralized ID generator
import { generateFilterId } from "@/lib/utils/id-generator";

// Get available operators for a field type
export function getOperatorsForFieldType(fieldType: FilterFieldType, propertyType?: PropertyDefinition["type"]): FilterOperator[] {
    switch (fieldType) {
        case "name":
            return ["contains", "equals", "starts_with", "ends_with"];
        case "label":
            return ["has_label", "not_has_label", "has_any_label", "has_no_labels"];
        case "type":
            return ["equals", "not_equals"];
        case "date_modified":
            return ["before", "after", "on", "today", "this_week", "this_month"];
        case "property":
            switch (propertyType) {
                case "text":
                    return ["contains", "equals", "starts_with", "ends_with", "is_empty", "is_not_empty"];
                case "number":
                    return ["equals", "not_equals", "greater_than", "less_than", "greater_or_equal", "less_or_equal"];
                case "date":
                    return ["before", "after", "on", "today", "this_week", "this_month"];
                case "select":
                    return ["equals", "not_equals", "is_empty", "is_not_empty"];
                case "multi-select":
                    return ["contains", "not_contains", "contains_all", "is_empty", "is_not_empty"];
                case "checkbox":
                    return ["equals"];
                default:
                    return ["contains", "equals"];
            }
        default:
            return ["contains", "equals"];
    }
}

// Check if a single file matches a condition
function matchesCondition(
    file: DriveFile,
    condition: FilterCondition,
    taggedItemData?: { labels: string[]; properties: Record<string, string | number | boolean | string[]> }
): boolean {
    const { fieldType, fieldId, operator, value } = condition;

    switch (fieldType) {
        case "name": {
            const fileName = file.name.toLowerCase();
            const searchValue = String(value || "").toLowerCase();

            switch (operator) {
                case "contains":
                    return fileName.includes(searchValue);
                case "equals":
                    return fileName === searchValue;
                case "starts_with":
                    return fileName.startsWith(searchValue);
                case "ends_with":
                    return fileName.endsWith(searchValue);
                default:
                    return true;
            }
        }

        case "label": {
            const fileLabels = taggedItemData?.labels || [];

            switch (operator) {
                case "has_label":
                    return Array.isArray(value)
                        ? value.some(v => fileLabels.includes(String(v)))
                        : fileLabels.includes(String(value));
                case "not_has_label":
                    return Array.isArray(value)
                        ? !value.some(v => fileLabels.includes(String(v)))
                        : !fileLabels.includes(String(value));
                case "has_any_label":
                    return fileLabels.length > 0;
                case "has_no_labels":
                    return fileLabels.length === 0;
                default:
                    return true;
            }
        }

        case "type": {
            const isFolder = file.mimeType === "application/vnd.google-apps.folder";
            const fileType = isFolder ? "folder" : "file";

            switch (operator) {
                case "equals":
                    return fileType === value;
                case "not_equals":
                    return fileType !== value;
                default:
                    return true;
            }
        }

        case "date_modified": {
            if (!file.modifiedTime) return false;
            const fileDate = new Date(file.modifiedTime);
            const now = new Date();

            switch (operator) {
                case "before":
                    return value instanceof Date && fileDate < value;
                case "after":
                    return value instanceof Date && fileDate > value;
                case "on":
                    if (value instanceof Date) {
                        return fileDate.toDateString() === value.toDateString();
                    }
                    return false;
                case "today": {
                    return fileDate.toDateString() === now.toDateString();
                }
                case "this_week": {
                    const weekStart = new Date(now);
                    weekStart.setDate(now.getDate() - now.getDay());
                    weekStart.setHours(0, 0, 0, 0);
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 7);
                    return fileDate >= weekStart && fileDate < weekEnd;
                }
                case "this_month": {
                    return fileDate.getMonth() === now.getMonth() && fileDate.getFullYear() === now.getFullYear();
                }
                default:
                    return true;
            }
        }

        case "property": {
            if (!fieldId || !taggedItemData) return true;
            const propValue = taggedItemData.properties[fieldId];

            // Handle empty/not empty checks first
            if (operator === "is_empty") {
                return propValue === undefined || propValue === null || propValue === "" || (Array.isArray(propValue) && propValue.length === 0);
            }
            if (operator === "is_not_empty") {
                return propValue !== undefined && propValue !== null && propValue !== "" && !(Array.isArray(propValue) && propValue.length === 0);
            }

            // If no value set for filter, skip
            if (value === undefined || value === null) return true;

            // Handle different property types
            if (typeof propValue === "string") {
                const propStr = propValue.toLowerCase();
                const valStr = String(value).toLowerCase();

                switch (operator) {
                    case "contains":
                        return propStr.includes(valStr);
                    case "equals":
                        return propStr === valStr;
                    case "starts_with":
                        return propStr.startsWith(valStr);
                    case "ends_with":
                        return propStr.endsWith(valStr);
                    case "not_equals":
                        return propStr !== valStr;
                    default:
                        return true;
                }
            }

            if (typeof propValue === "number") {
                const numValue = typeof value === "number" ? value : parseFloat(String(value));
                if (isNaN(numValue)) return true;

                switch (operator) {
                    case "equals":
                        return propValue === numValue;
                    case "not_equals":
                        return propValue !== numValue;
                    case "greater_than":
                        return propValue > numValue;
                    case "less_than":
                        return propValue < numValue;
                    case "greater_or_equal":
                        return propValue >= numValue;
                    case "less_or_equal":
                        return propValue <= numValue;
                    default:
                        return true;
                }
            }

            if (typeof propValue === "boolean") {
                const boolValue = value === true || String(value) === "true" || value === 1;
                return operator === "equals" ? propValue === boolValue : propValue !== boolValue;
            }

            if (Array.isArray(propValue)) {
                const valArray = Array.isArray(value) ? value : [String(value)];

                switch (operator) {
                    case "contains":
                        return valArray.some(v => propValue.includes(String(v)));
                    case "not_contains":
                        return !valArray.some(v => propValue.includes(String(v)));
                    case "contains_all":
                        return valArray.every(v => propValue.includes(String(v)));
                    default:
                        return true;
                }
            }

            return true;
        }

        default:
            return true;
    }
}

// Apply all filters to a list of files
export function applyFilters(
    files: DriveFile[],
    filterGroup: FilterGroup,
    taggedItems: Record<string, { labels: string[]; properties: Record<string, string | number | boolean | string[]> }>
): DriveFile[] {
    if (filterGroup.conditions.length === 0) {
        return files;
    }

    return files.filter(file => {
        const taggedData = taggedItems[file.id];

        if (filterGroup.logic === "and") {
            return filterGroup.conditions.every(condition =>
                matchesCondition(file, condition, taggedData)
            );
        } else {
            return filterGroup.conditions.some(condition =>
                matchesCondition(file, condition, taggedData)
            );
        }
    });
}

// Create a new empty filter condition
export function createFilterCondition(fieldType: FilterFieldType = "name"): FilterCondition {
    return {
        id: generateFilterId(),
        fieldType,
        operator: fieldType === "label" ? "has_label" : "contains",
    };
}
