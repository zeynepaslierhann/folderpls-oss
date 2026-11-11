import { describe, expect, it } from "vitest";
import { buildGraphModel } from "@/lib/graph/build-graph";
import { getFocusedSubgraph } from "@/lib/graph/focus";
import { clusterGroups, groupByConnector, groupKeyOf } from "@/lib/graph/cluster";
import type { DriveFile } from "@/lib/types";

function file(id: string, parent: string): DriveFile {
  return { id, name: id, mimeType: "text/plain", parents: [parent] };
}

function folderWithManyFiles(count: number) {
  const files: DriveFile[] = [{ id: "a", name: "a", mimeType: "application/vnd.google-apps.folder", parents: ["root"] }];
  for (let i = 0; i < count; i++) files.push(file(`f${i}`, "a"));
  return buildGraphModel({ files, taggedItems: [], labels: [], rootFolderId: "root", rootFolderName: "Root" });
}

describe("groupByConnector", () => {
  it("groups discovered nodes by the neighbor they were found through, plus their type", () => {
    const model = folderWithManyFiles(3);
    const visited = new Map([
      ["root", { distance: 0, connectorId: "root" }],
      ["a", { distance: 1, connectorId: "root" }],
      ["f0", { distance: 2, connectorId: "a" }],
      ["f1", { distance: 2, connectorId: "a" }],
    ]);
    const groups = groupByConnector(model, visited, "root");
    const key = groupKeyOf("a", "file");
    expect([...(groups.get(key)?.memberIds ?? [])].sort()).toEqual(["f0", "f1"]);
    expect(groups.has(groupKeyOf("root", "folder"))).toBe(true); // "a" itself, connector=root
  });
});

describe("clusterGroups / getFocusedSubgraph clustering", () => {
  it("leaves a group untouched when it's at or below the threshold", () => {
    const model = folderWithManyFiles(5);
    const result = getFocusedSubgraph(model, "a", { depth: 1, groupClusterThreshold: 10 });
    expect(result.clusters).toEqual([]);
    expect(result.nodes).toHaveLength(1 /* root */ + 1 /* a */ + 5 /* files */);
  });

  it("collapses a group past the threshold into a cluster node + kept nodes", () => {
    const model = folderWithManyFiles(50);
    const result = getFocusedSubgraph(model, "a", {
      depth: 1,
      groupClusterThreshold: 10,
      groupKeepCount: 4,
    });
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0].count).toBe(46); // 50 - 4 kept
    const clusterNode = result.nodes.find((n) => n.type === "cluster");
    expect(clusterNode?.clusterCount).toBe(46);
    // root + a + 4 kept files + 1 cluster node
    expect(result.nodes).toHaveLength(1 + 1 + 4 + 1);
  });

  it("expandedGroupKeys reveals the full group instead of clustering it", () => {
    const model = folderWithManyFiles(50);
    const key = groupKeyOf("a", "file");
    const result = getFocusedSubgraph(model, "a", {
      depth: 1,
      groupClusterThreshold: 10,
      groupKeepCount: 4,
      expandedGroupKeys: new Set([key]),
    });
    expect(result.clusters).toEqual([]);
    expect(result.nodes.filter((n) => n.type === "file")).toHaveLength(50);
  });

  it("still enforces hardNodeCap even for an expanded group, and reports truncated", () => {
    const model = folderWithManyFiles(50);
    const key = groupKeyOf("a", "file");
    const result = getFocusedSubgraph(model, "a", {
      depth: 1,
      groupClusterThreshold: 10,
      groupKeepCount: 4,
      expandedGroupKeys: new Set([key]),
      hardNodeCap: 20,
    });
    expect(result.truncated).toBe(true);
    expect(result.nodes.length).toBeLessThanOrEqual(20);
  });

  it("clusterGroups alone: threshold + keep-count is deterministic and order-stable", () => {
    const model = folderWithManyFiles(20);
    const visited = new Map<string, { distance: number; connectorId: string }>([["root", { distance: 0, connectorId: "root" }]]);
    for (const [id, node] of model.nodes) {
      if (id === "root") continue;
      visited.set(id, { distance: 1, connectorId: node.parentId ?? "root" });
    }
    const groups = groupByConnector(model, visited, "root");
    const pass1 = clusterGroups(groups, {
      groupClusterThreshold: 5,
      groupKeepCount: 2,
      hardNodeCap: 500,
      expandedGroupKeys: new Set(),
    });
    const pass2 = clusterGroups(groups, {
      groupClusterThreshold: 5,
      groupKeepCount: 2,
      hardNodeCap: 500,
      expandedGroupKeys: new Set(),
    });
    expect([...pass1.keptNodeIds].sort()).toEqual([...pass2.keptNodeIds].sort());
  });
});
