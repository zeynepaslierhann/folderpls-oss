import { describe, expect, it } from "vitest";
import {
  filterGroupByteSize,
  isCollectionNameTooLong,
  isFilterGroupTooLarge,
  MAX_COLLECTION_NAME_LENGTH,
  MAX_FILTER_GROUP_BYTES,
} from "@/lib/collections/limits";
import type { FilterGroup } from "@/lib/types";

// Güvenlik denetimi D8: koleksiyon `name`/`filterGroup` boyutu önceden
// sınırsızdı — bir kullanıcı Firestore'un doküman tavanına (1 MB) kadar
// büyük bir koleksiyon dokümanı yazabiliyordu.

describe("isCollectionNameTooLong", () => {
  it("accepts a name at or under the limit", () => {
    expect(isCollectionNameTooLong("a".repeat(MAX_COLLECTION_NAME_LENGTH))).toBe(false);
    expect(isCollectionNameTooLong("short name")).toBe(false);
  });

  it("rejects a name over the limit", () => {
    expect(isCollectionNameTooLong("a".repeat(MAX_COLLECTION_NAME_LENGTH + 1))).toBe(true);
  });
});

describe("filterGroupByteSize / isFilterGroupTooLarge", () => {
  const small: FilterGroup = { logic: "and", conditions: [] };

  it("a tiny filterGroup is well under the byte limit", () => {
    expect(filterGroupByteSize(small)).toBeLessThan(MAX_FILTER_GROUP_BYTES);
    expect(isFilterGroupTooLarge(small)).toBe(false);
  });

  it("rejects a filterGroup whose serialized JSON exceeds the byte limit", () => {
    const huge: FilterGroup = {
      logic: "and",
      conditions: Array.from({ length: 2000 }, (_, i) => ({
        id: `cond-${i}`,
        fieldType: "label",
        operator: "equals",
        value: `padding-value-${i}-${"x".repeat(20)}`,
      })),
    };
    expect(filterGroupByteSize(huge)).toBeGreaterThan(MAX_FILTER_GROUP_BYTES);
    expect(isFilterGroupTooLarge(huge)).toBe(true);
  });

  it("counts UTF-8 bytes, not JS string .length (multi-byte chars cost more)", () => {
    const ascii: FilterGroup = {
      logic: "and",
      conditions: [{ id: "c1", fieldType: "name", operator: "equals", value: "a" }],
    };
    const multiByte: FilterGroup = {
      logic: "and",
      conditions: [{ id: "c1", fieldType: "name", operator: "equals", value: "€" }],
    };
    // '€' is 1 JS string char but 3 UTF-8 bytes — byte size must reflect that.
    expect(filterGroupByteSize(multiByte)).toBeGreaterThan(filterGroupByteSize(ascii));
  });
});
