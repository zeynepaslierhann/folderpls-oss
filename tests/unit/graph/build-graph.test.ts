import { describe, expect, it } from "vitest";
import { buildGraphModel } from "@/lib/graph/build-graph";
import type { DriveFile, LabelItem, TaggedItem } from "@/lib/types";

const FOLDER = "application/vnd.google-apps.folder";

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

const label = (id: string, overrides: Partial<LabelItem> = {}): LabelItem => ({
  id,
  name: id,
  color: "#ff0000",
  ...overrides,
});

describe("buildGraphModel", () => {
  it("always creates a root node, even with no files", () => {
    const model = buildGraphModel({
      files: [],
      taggedItems: [],
      labels: [],
      rootFolderId: "root",
      rootFolderName: "FolderPls",
    });
    expect(model.nodes.get("root")).toEqual({ id: "root", type: "root", name: "FolderPls" });
    expect(model.edges).toEqual([]);
  });

  it("classifies files vs folders by mimeType and wires parent-child edges", () => {
    const model = buildGraphModel({
      files: [file("f1", { mimeType: FOLDER, parents: ["root"] }), file("f2", { parents: ["f1"] })],
      taggedItems: [],
      labels: [],
      rootFolderId: "root",
      rootFolderName: "Root",
    });
    expect(model.nodes.get("f1")?.type).toBe("folder");
    expect(model.nodes.get("f2")?.type).toBe("file");
    expect(model.edges).toContainEqual(
      expect.objectContaining({ source: "root", target: "f1", type: "parent-child" })
    );
    expect(model.edges).toContainEqual(
      expect.objectContaining({ source: "f1", target: "f2", type: "parent-child" })
    );
  });

  it("skips trashed files entirely (no node, no edge)", () => {
    const model = buildGraphModel({
      files: [file("f1", { trashed: true })],
      taggedItems: [],
      labels: [],
      rootFolderId: "root",
      rootFolderName: "Root",
    });
    expect(model.nodes.has("f1")).toBe(false);
    expect(model.edges).toEqual([]);
  });

  it("only creates label nodes for labels actually used by a visible file", () => {
    const model = buildGraphModel({
      files: [file("f1")],
      taggedItems: [tagged("f1", { labels: ["l1"] })],
      labels: [label("l1"), label("l2")],
      rootFolderId: "root",
      rootFolderName: "Root",
    });
    expect(model.nodes.has("label-l1")).toBe(true);
    expect(model.nodes.has("label-l2")).toBe(false);
    expect(model.edges).toContainEqual(
      expect.objectContaining({ source: "f1", target: "label-l1", type: "file-label" })
    );
  });

  it("drops expired labels but keeps still-valid ones", () => {
    const now = Date.now();
    const model = buildGraphModel({
      files: [file("f1")],
      taggedItems: [
        tagged("f1", {
          labels: ["expired", "fresh"],
          labelExpiries: { expired: now - 1000, fresh: now + 100000 },
        }),
      ],
      labels: [label("expired"), label("fresh")],
      rootFolderId: "root",
      rootFolderName: "Root",
    });
    expect(model.nodes.has("label-fresh")).toBe(true);
    expect(model.nodes.has("label-expired")).toBe(false);
  });

  it("wires file-relation edges only when both endpoints are visible nodes", () => {
    const model = buildGraphModel({
      files: [file("f1"), file("f2")],
      taggedItems: [
        tagged("f1", { relations: [{ targetFileId: "f2", relationType: "reference", createdAt: new Date() }] }),
        tagged("f3", { relations: [{ targetFileId: "f1", relationType: "reference", createdAt: new Date() }] }),
      ],
      labels: [],
      rootFolderId: "root",
      rootFolderName: "Root",
    });
    expect(model.edges).toContainEqual(
      expect.objectContaining({ source: "f1", target: "f2", type: "file-relation", relationType: "reference" })
    );
    // f3 has no node in the graph (not in `files`), so its relation is dropped.
    expect(model.edges.filter((e) => e.type === "file-relation")).toHaveLength(1);
  });

  it("builds a symmetric neighbor index for BFS", () => {
    const model = buildGraphModel({
      files: [file("f1", { parents: ["root"] })],
      taggedItems: [],
      labels: [],
      rootFolderId: "root",
      rootFolderName: "Root",
    });
    expect(model.neighbors.get("root")).toContain("f1");
    expect(model.neighbors.get("f1")).toContain("root");
  });
});
