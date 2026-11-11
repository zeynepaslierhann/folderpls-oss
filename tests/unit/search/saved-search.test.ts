import { describe, expect, it } from "vitest";
import { queryToFilterGroup } from "@/lib/search/saved-search";
import { applyFilters } from "@/lib/search/search-utils";
import type { SearchQuery } from "@/lib/search/types";
import { buildSampleDataset, SAMPLE_PROPERTIES } from "./fixtures";

/**
 * Backward-compat contract: a query built in search v2 must serialize to a
 * `FilterGroup` that the *existing, untouched* `applyFilters` (used to apply
 * saved SmartCollections) interprets the same way — so collections saved
 * from the new search UI keep working exactly like collections saved
 * before this rebuild.
 */
describe("queryToFilterGroup — SmartCollection backward compatibility", () => {
  const data = buildSampleDataset();
  const taggedById: Record<string, { labels: string[]; properties: Record<string, string | number | boolean | string[]> }> = {};
  for (const t of data.taggedItems) {
    taggedById[t.itemId] = { labels: t.labels, properties: t.properties };
  }

  it("serializes free text to a name-contains condition applyFilters understands", () => {
    const query: SearchQuery = { text: "Fatura", chips: [] };
    const group = queryToFilterGroup(query);
    const results = applyFilters(data.files, group, taggedById);
    expect(results.map((f) => f.id)).toEqual(["f2"]);
  });

  it("serializes a label chip to a has_label condition", () => {
    const query: SearchQuery = { text: "", chips: [{ id: "c1", kind: "label", labelId: "lbl_sozlesme", displayLabel: "" }] };
    const group = queryToFilterGroup(query);
    const results = applyFilters(data.files, group, taggedById);
    expect(results.map((f) => f.id)).toEqual(["f3"]);
  });

  it("serializes a type chip (folder/file only — legacy limitation)", () => {
    const query: SearchQuery = { text: "", chips: [{ id: "c1", kind: "type", fileType: "folder", displayLabel: "" }] };
    const group = queryToFilterGroup(query);
    const results = applyFilters(data.files, group, taggedById);
    expect(results.map((f) => f.id)).toEqual(["d1"]);
  });

  it("serializes a property chip to a property-equals condition, resolving the display value back to its raw option id", () => {
    const query: SearchQuery = {
      text: "",
      chips: [{ id: "c1", kind: "property", propertyId: "prop_status", propertyValue: "Taslak", displayLabel: "" }],
    };
    const group = queryToFilterGroup(query, SAMPLE_PROPERTIES);
    // Sanity check: the stored raw value is the option id, not the display name.
    expect(group.conditions[0].value).toBe("opt_draft");
    const results = applyFilters(data.files, group, taggedById);
    // Legacy `applyFilters` (untouched) treats items with no relevant tagged
    // data as passing a property filter — it only actively excludes items
    // that explicitly have a *different* value for that property. f2 has
    // prop_status = opt_approved, so it's the only one excluded here.
    expect(results.map((f) => f.id)).toEqual(["f1", "f3", "f4", "d1"]);
    expect(results.map((f) => f.id)).not.toContain("f2");
  });

  it("serializes a date range chip to after+before conditions", () => {
    const query: SearchQuery = {
      text: "",
      chips: [
        {
          id: "c1",
          kind: "dateRange",
          dateFrom: Date.parse("2023-12-31"),
          dateTo: Date.parse("2024-01-02"),
          displayLabel: "",
        },
      ],
    };
    const group = queryToFilterGroup(query);
    const results = applyFilters(data.files, group, taggedById);
    // All fixture files are modified on 2024-01-01, so all should match.
    expect(results.length).toBe(data.files.length);
  });

  it("combines free text and chips with AND logic, same as before", () => {
    const query: SearchQuery = {
      text: "Taslağı",
      chips: [{ id: "c1", kind: "label", labelId: "lbl_sozlesme", displayLabel: "" }],
    };
    const group = queryToFilterGroup(query);
    expect(group.logic).toBe("and");
    const results = applyFilters(data.files, group, taggedById);
    expect(results.map((f) => f.id)).toEqual(["f3"]);
  });
});
