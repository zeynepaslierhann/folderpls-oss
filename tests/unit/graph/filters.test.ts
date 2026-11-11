import { describe, expect, it } from "vitest";
import { buildGraphModel } from "@/lib/graph/build-graph";
import { nodeMatchesFilters } from "@/lib/graph/filters";
import type { DriveFile } from "@/lib/types";

function file(id: string, parent: string, overrides: Partial<DriveFile> = {}): DriveFile {
  return { id, name: id, mimeType: "text/plain", parents: [parent], ...overrides };
}

function nested() {
  return buildGraphModel({
    files: [
      { id: "a", name: "a", mimeType: "application/vnd.google-apps.folder", parents: ["root"] },
      { id: "b", name: "b", mimeType: "application/vnd.google-apps.folder", parents: ["a"] },
      file("c", "b"),
    ],
    taggedItems: [],
    labels: [],
    rootFolderId: "root",
    rootFolderName: "Root",
  });
}

describe("nodeMatchesFilters", () => {
  it("passes everything when no filters are given", () => {
    const model = nested();
    expect(nodeMatchesFilters(model, model.nodes.get("c")!, undefined)).toBe(true);
  });

  it("nodeTypes restricts to the given set", () => {
    const model = nested();
    expect(nodeMatchesFilters(model, model.nodes.get("c")!, { nodeTypes: new Set(["file"]) })).toBe(true);
    expect(nodeMatchesFilters(model, model.nodes.get("a")!, { nodeTypes: new Set(["file"]) })).toBe(false);
  });

  it("folderId matches deep descendants, not just direct children", () => {
    const model = nested();
    // "c"'s parent is "b", whose parent is "a" — two levels deep from "a".
    expect(nodeMatchesFilters(model, model.nodes.get("c")!, { folderId: "a" })).toBe(true);
    expect(nodeMatchesFilters(model, model.nodes.get("c")!, { folderId: "somewhere-else" })).toBe(false);
  });

  it("folderId matches the folder node itself", () => {
    const model = nested();
    expect(nodeMatchesFilters(model, model.nodes.get("a")!, { folderId: "a" })).toBe(true);
  });
});
