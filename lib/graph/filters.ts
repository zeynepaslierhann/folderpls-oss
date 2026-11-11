import type { GraphFilters, GraphModel, GraphNode } from "./types";

/**
 * Whether a node passes the given filters. Pure — no notion of "center", the
 * caller (focus.ts) is responsible for always keeping the focused node itself.
 */
export function nodeMatchesFilters(model: GraphModel, node: GraphNode, filters?: GraphFilters): boolean {
  if (!filters) return true;

  if (filters.nodeTypes && !filters.nodeTypes.has(node.type)) return false;

  if (filters.labelIds && filters.labelIds.size > 0) {
    if (node.type === "label") {
      const labelId = node.id.replace(/^label-/, "");
      if (!filters.labelIds.has(labelId)) return false;
    } else if (node.type === "file" || node.type === "folder") {
      const tagged = model.taggedById.get(node.id);
      const hasMatch = tagged?.labels.some((id) => filters.labelIds?.has(id)) ?? false;
      if (!hasMatch) return false;
    }
    // root/cluster nodes are never excluded by a label filter.
  }

  if (filters.folderId) {
    if (node.type === "file" || node.type === "folder") {
      if (!isWithinFolder(model, node.id, filters.folderId)) return false;
    }
    // root/label/cluster nodes are never excluded by a folder filter.
  }

  return true;
}

/** Walks the drive parent chain; true if `nodeId` is `folderId` itself or a descendant of it. */
function isWithinFolder(model: GraphModel, nodeId: string, folderId: string): boolean {
  let current: string | undefined = nodeId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    if (current === folderId) return true;
    seen.add(current);
    current = model.nodes.get(current)?.parentId;
  }
  return false;
}
