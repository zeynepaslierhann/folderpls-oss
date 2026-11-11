/**
 * Label Type Definitions
 *
 * Types related to labels and tagging functionality.
 */

/**
 * Basic label item - used in UI components
 */
export type LabelItem = Record<"id" | "name" | "color", string>;

/**
 * Full label with metadata - stored in the label store
 */
export interface Label extends LabelItem {
  createdAt: Date;
}
