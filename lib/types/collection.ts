/**
 * Smart Collection Type Definitions
 */

import type { FilterGroup } from "./filter";

export interface SmartCollection {
  id: string;
  name: string;
  filterGroup: FilterGroup;
  icon?: string;
  color?: string;
  itemCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
