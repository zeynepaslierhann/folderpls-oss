/**
 * Filter Type Definitions
 *
 * Types related to filtering and search functionality.
 */

// Operator types for different field types
type TextOperator =
  | "contains"
  | "equals"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty";

type NumberOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_or_equal"
  | "less_or_equal";

type DateOperator =
  | "before"
  | "after"
  | "on"
  | "between"
  | "today"
  | "this_week"
  | "this_month";

type SelectOperator = "equals" | "not_equals";

type MultiSelectOperator = "contains" | "not_contains" | "contains_all";

type LabelOperator =
  | "has_label"
  | "not_has_label"
  | "has_any_label"
  | "has_no_labels";

/**
 * Combined filter operator type
 */
export type FilterOperator =
  | TextOperator
  | NumberOperator
  | DateOperator
  | SelectOperator
  | MultiSelectOperator
  | LabelOperator;

/**
 * Field types that can be filtered
 */
export type FilterFieldType = "name" | "label" | "property" | "type" | "date_modified";

/**
 * Single filter condition
 */
export interface FilterCondition {
  id: string;
  fieldType: FilterFieldType;
  fieldId?: string; // For property filters, this is the property definition ID
  fieldName?: string; // Display name for the field
  operator: FilterOperator;
  value?: string | number | boolean | string[] | Date | [Date, Date];
}

/**
 * Filter group with AND/OR logic
 */
export interface FilterGroup {
  logic: "and" | "or";
  conditions: FilterCondition[];
}

/**
 * Saved filter configuration
 */
export interface SavedFilter extends Record<"createdAt" | "updatedAt", Date> {
  id: string;
  name: string;
  filterGroup: FilterGroup;
  icon?: string;
  color?: string;
}
