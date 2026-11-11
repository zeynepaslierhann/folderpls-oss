import type { GraphEdge, GraphModel, GraphModelInput, GraphNode } from "./types";

// Duplicated on purpose (not imported from lib/google-drive): lib/graph stays a
// self-contained, dependency-free module so it can be unit-tested in isolation
// and reused by any caller without pulling in Drive API helpers.
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

/**
 * Builds a pure, in-memory graph model from already-loaded data. Never fetches
 * anything — the caller (a page/hook) owns loading `files`/`taggedItems`.
 */
export function buildGraphModel(input: GraphModelInput): GraphModel {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const neighbors = new Map<string, string[]>();
  const taggedById = new Map(input.taggedItems.map((item) => [item.itemId, item]));

  const addNeighbor = (a: string, b: string) => {
    let listA = neighbors.get(a);
    if (!listA) {
      listA = [];
      neighbors.set(a, listA);
    }
    listA.push(b);
  };
  const addEdge = (edge: GraphEdge) => {
    edges.push(edge);
    addNeighbor(edge.source, edge.target);
    addNeighbor(edge.target, edge.source);
  };

  // ── Nodes: root ─────────────────────────────────────────────────────────
  nodes.set(input.rootFolderId, {
    id: input.rootFolderId,
    type: "root",
    name: input.rootFolderName,
  });

  // ── Nodes: files & folders (skip trashed — nothing useful to show/link) ──
  for (const file of input.files) {
    if (file.trashed || nodes.has(file.id)) continue;
    const isFolder = file.mimeType === FOLDER_MIME_TYPE;
    nodes.set(file.id, {
      id: file.id,
      type: isFolder ? "folder" : "file",
      name: file.name,
      parentId: file.parents?.[0],
      driveFile: file,
    });
  }

  // ── Edges: drive hierarchy ────────────────────────────────────────────────
  for (const file of input.files) {
    if (file.trashed) continue;
    const parentId = file.parents?.[0];
    if (parentId && nodes.has(parentId) && nodes.has(file.id)) {
      addEdge({
        id: `pc:${parentId}:${file.id}`,
        source: parentId,
        target: file.id,
        type: "parent-child",
      });
    }
  }

  // ── Nodes: labels (only ones actually used by a visible node) + edges ────
  const usedLabelIds = new Set<string>();
  for (const item of input.taggedItems) {
    if (!nodes.has(item.itemId)) continue;
    for (const labelId of activeLabelIds(item)) usedLabelIds.add(labelId);
  }
  const labelById = new Map(input.labels.map((l) => [l.id, l]));
  for (const labelId of usedLabelIds) {
    const label = labelById.get(labelId);
    if (!label) continue; // stale label id, no definition left
    nodes.set(labelNodeId(labelId), {
      id: labelNodeId(labelId),
      type: "label",
      name: label.name,
      labelColor: label.color,
    });
  }
  for (const item of input.taggedItems) {
    if (!nodes.has(item.itemId)) continue;
    for (const labelId of activeLabelIds(item)) {
      const target = labelNodeId(labelId);
      if (!nodes.has(target)) continue;
      addEdge({
        id: `fl:${item.itemId}:${labelId}`,
        source: item.itemId,
        target,
        type: "file-label",
      });
    }
  }

  // ── Edges: file ↔ file relations ──────────────────────────────────────────
  for (const item of input.taggedItems) {
    if (!nodes.has(item.itemId) || !item.relations) continue;
    for (const relation of item.relations) {
      if (!nodes.has(relation.targetFileId)) continue;
      addEdge({
        id: `fr:${item.itemId}:${relation.targetFileId}`,
        source: item.itemId,
        target: relation.targetFileId,
        type: "file-relation",
        relationType: relation.relationType,
      });
    }
  }

  return {
    rootId: input.rootFolderId,
    nodes,
    edges,
    neighbors,
    taggedById,
    labels: input.labels,
    properties: input.properties ?? [],
  };
}

function labelNodeId(labelId: string): string {
  return `label-${labelId}`;
}

/** A label counts as active if it has no expiry, or its expiry hasn't passed yet. */
function activeLabelIds(item: { labels: string[]; labelExpiries?: Record<string, number> }): string[] {
  if (!item.labelExpiries) return item.labels;
  const now = Date.now();
  return item.labels.filter((id) => {
    const exp = item.labelExpiries?.[id];
    return exp === undefined || exp >= now;
  });
}
