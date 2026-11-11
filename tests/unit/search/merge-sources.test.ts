import { describe, expect, it } from "vitest";
import { mergeFileSources } from "@/lib/search/merge-sources";
import { makeFile } from "./fixtures";

describe("mergeFileSources", () => {
  it("dedupes by id, keeping the last-seen copy", () => {
    const a = [makeFile({ id: "1", name: "A" })];
    const b = [makeFile({ id: "1", name: "A-updated" }), makeFile({ id: "2", name: "B" })];
    const merged = mergeFileSources(a, b);
    expect(merged.map((f) => f.id).sort()).toEqual(["1", "2"]);
    expect(merged.find((f) => f.id === "1")?.name).toBe("A-updated");
  });

  it("handles empty sources", () => {
    expect(mergeFileSources([], [])).toEqual([]);
  });
});
