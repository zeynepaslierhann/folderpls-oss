import { describe, expect, it } from "vitest";
import { clearRecentSearches, loadRecentSearches, pushRecentSearch } from "@/lib/search/recent-searches";

// The default vitest environment here is Node (no `window`), matching SSR.
// These helpers must degrade gracefully rather than throwing.
describe("recent-searches (SSR-safe, no window)", () => {
  it("loadRecentSearches returns an empty array without throwing", () => {
    expect(loadRecentSearches()).toEqual([]);
  });

  it("pushRecentSearch is a safe no-op", () => {
    expect(() => pushRecentSearch("rapor")).not.toThrow();
  });

  it("clearRecentSearches is a safe no-op", () => {
    expect(() => clearRecentSearches()).not.toThrow();
  });
});
