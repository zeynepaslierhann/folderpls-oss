/**
 * Built-in status property constants
 */

import type { PropertyOption, PropertyDefinition } from "@/lib/types";

export const STATUS_PROPERTY_ID = "__status__";

// Colors reference theme tokens (globals.css) so they adapt to light/dark.
export const STATUS_OPTIONS: PropertyOption[] = [
  {
    id: "draft",
    name: "Draft",
    color: "hsl(var(--status-draft))",
    textColor: "hsl(var(--status-draft-foreground))",
    isPreset: true,
  },
  {
    id: "in_review",
    name: "In Review",
    color: "hsl(var(--status-in-review))",
    textColor: "hsl(var(--status-in-review-foreground))",
    isPreset: true,
  },
  {
    id: "approved",
    name: "Approved",
    color: "hsl(var(--status-approved))",
    textColor: "hsl(var(--status-approved-foreground))",
    isPreset: true,
  },
  {
    id: "final",
    name: "Final",
    color: "hsl(var(--status-final))",
    textColor: "hsl(var(--status-final-foreground))",
    isPreset: true,
  },
];

export const STATUS_PROPERTY_DEFINITION: PropertyDefinition = {
  id: STATUS_PROPERTY_ID,
  name: "Status",
  type: "status",
  isBuiltin: true,
  options: STATUS_OPTIONS,
  createdAt: new Date(0),
};
