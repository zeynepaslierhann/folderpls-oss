/**
 * Property Type Definitions
 *
 * Types related to custom property definitions.
 */

/**
 * Option for select/multi-select property types
 */
export interface PropertyOption extends Record<"id" | "name" | "color", string> {
  /** Optional paired text color for badges (e.g. dark text on a light status). */
  textColor?: string;
  createdAt?: Date;
  isPreset?: boolean;
}

/**
 * Property definition - defines a custom field
 */
export interface PropertyDefinition {
  id: string;
  name: string;
  type: "text" | "number" | "select" | "multi-select" | "date" | "checkbox" | "status";
  options?: PropertyOption[];
  isBuiltin?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}
