/**
 * ID Generator Utility Functions
 *
 * Centralized ID generation utilities.
 */

/**
 * Generate a unique ID with optional prefix
 */
function generateId(prefix: string = "id"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique label ID
 */
export function generateLabelId(): string {
  return generateId("label");
}

/**
 * Generate a unique filter ID
 */
export function generateFilterId(): string {
  return generateId("filter");
}

/**
 * Generate a unique property ID
 */
export function generatePropertyId(): string {
  return generateId("prop");
}
