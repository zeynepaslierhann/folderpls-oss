import { describe, expect, it } from "vitest";
import { buildGraphModel } from "@/lib/graph/build-graph";
import { getFocusedSubgraph } from "@/lib/graph/focus";
import type { DriveFile, LabelItem, TaggedItem } from "@/lib/types";

function file(id: string, overrides: Partial<DriveFile> = {}): DriveFile {
  return { id, name: id, mimeType: "text/plain", parents: ["root"], ...overrides };
}
function tagged(itemId: string, overrides: Partial<TaggedItem> = {}): TaggedItem {
  return {
    itemId,
    name: itemId,
    type: "file",
    labels: [],
    properties: {},
    notes: [],
    addedAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
const label = (id: string): LabelItem => ({ id, name: id, color: "#fff" });

// root -> a (folder) -> b (file) -> c (file, via relation)
//                     -> labeled with "l1"
function buildFixtureModel() {
  return buildGraphModel({
    files: [
      file("a", { mimeType: "application/vnd.google-apps.folder", parents: ["root"] }),
      file("b", { parents: ["a"] }),
      file("c", { parents: ["a"] }),
    ],
    taggedItems: [
      tagged("b", { labels: ["l1"], relations: [{ targetFileId: "c", relationType: "reference", createdAt: new Date() }] }),
    ],
    labels: [label("l1")],
    rootFolderId: "root",
    rootFolderName: "Root",
  });
}

describe("getFocusedSubgraph", () => {
  it("defaults to the model root when no focusId is given", () => {
    const model = buildFixtureModel();
    const result = getFocusedSubgraph(model, undefined);
    expect(result.centerId).toBe("root");
  });

  it("returns an empty result for an unknown focus id", () => {
    const model = buildFixtureModel();
    const result = getFocusedSubgraph(model, "does-not-exist");
    expect(result).toEqual({ centerId: null, nodes: [], edges: [], clusters: [], truncated: false });
  });

  it("depth 1 includes only direct neighbors of the focus", () => {
    const model = buildFixtureModel();
    const result = getFocusedSubgraph(model, "a", { depth: 1 });
    const ids = result.nodes.map((n) => n.id).sort();
    // a's direct neighbors: root (parent), b, c (children)
    expect(ids).toEqual(["a", "b", "c", "root"]);
  });

  it("depth 2 reaches neighbors-of-neighbors (e.g. b's label and relation)", () => {
    const model = buildFixtureModel();
    const result = getFocusedSubgraph(model, "a", { depth: 2 });
    const ids = result.nodes.map((n) => n.id).sort();
    expect(ids).toContain("label-l1");
    expect(ids).toContain("c"); // via b's relation, reached at depth 2
  });

  it("nodeTypes filter excludes non-matching neighbor types (root/center still included)", () => {
    const model = buildFixtureModel();
    const result = getFocusedSubgraph(model, "b", {
      depth: 2,
      filters: { nodeTypes: new Set(["file", "folder"]) },
    });
    const ids = result.nodes.map((n) => n.id);
    expect(ids).not.toContain("label-l1");
    expect(ids).toContain("c");
  });

  it("labelIds filter keeps only files carrying one of the given labels", () => {
    const model = buildFixtureModel();
    const result = getFocusedSubgraph(model, "a", {
      depth: 1,
      filters: { labelIds: new Set(["l1"]) },
    });
    const ids = result.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(["a", "b", "root"]); // c has no label, dropped
  });

  it("folderId filter keeps only nodes within that folder's subtree", () => {
    const model = buildFixtureModel();
    const result = getFocusedSubgraph(model, "root", {
      depth: 2,
      filters: { folderId: "a" },
    });
    const ids = result.nodes.map((n) => n.id).sort();
    // root itself is always kept as center; "a" and its direct children (b, c) pass the subtree check
    expect(ids).toEqual(["a", "b", "c", "root"]);
  });

  it("edges returned only connect nodes that are actually rendered", () => {
    const model = buildFixtureModel();
    const result = getFocusedSubgraph(model, "a", { depth: 1 });
    for (const edge of result.edges) {
      const ids = result.nodes.map((n) => n.id);
      expect(ids).toContain(edge.source);
      expect(ids).toContain(edge.target);
    }
  });
});
