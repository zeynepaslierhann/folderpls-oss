import type { ClusterInfo, GraphModel, GraphNode, GraphNodeType } from "./types";

export interface VisitedInfo {
  readonly distance: number;
  readonly connectorId: string;
}

export interface GroupMembers {
  readonly connectorId: string;
  readonly nodeType: GraphNodeType;
  /** Node ids, sorted by name — stable/deterministic keep-vs-hide split. */
  readonly memberIds: readonly string[];
}

/** `"<connectorId>::<nodeType>"` — stable, reproducible from the same inputs. */
export function groupKeyOf(connectorId: string, nodeType: GraphNodeType): string {
  return `${connectorId}::${nodeType}`;
}

/**
 * Groups every visited node (except the center) by the neighbor it was
 * discovered through (its BFS "connector") and its type. This is what lets a
 * folder with 300 files collapse into one cluster instead of 300 loose nodes.
 */
export function groupByConnector(
  model: GraphModel,
  visited: ReadonlyMap<string, VisitedInfo>,
  centerId: string
): Map<string, GroupMembers> {
  const buckets = new Map<string, { connectorId: string; nodeType: GraphNodeType; ids: string[] }>();
  for (const [id, info] of visited) {
    if (id === centerId) continue;
    const node = model.nodes.get(id);
    if (!node) continue;
    const key = groupKeyOf(info.connectorId, node.type);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { connectorId: info.connectorId, nodeType: node.type, ids: [] };
      buckets.set(key, bucket);
    }
    bucket.ids.push(id);
  }
  const groups = new Map<string, GroupMembers>();
  for (const [key, bucket] of buckets) {
    const memberIds = [...bucket.ids].sort((a, b) => {
      const na = model.nodes.get(a)?.name ?? a;
      const nb = model.nodes.get(b)?.name ?? b;
      return na.localeCompare(nb);
    });
    groups.set(key, { connectorId: bucket.connectorId, nodeType: bucket.nodeType, memberIds });
  }
  return groups;
}

export interface ClusterPassOptions {
  readonly groupClusterThreshold: number;
  readonly groupKeepCount: number;
  readonly hardNodeCap: number;
  readonly expandedGroupKeys: ReadonlySet<string>;
}

export interface ClusterPassResult {
  /** Real node ids to render (center is not included, caller adds it). */
  readonly keptNodeIds: ReadonlySet<string>;
  readonly clusters: readonly ClusterInfo[];
  readonly truncated: boolean;
}

/**
 * Applies per-group clustering (a group past `groupClusterThreshold` collapses
 * to `groupKeepCount` real nodes + 1 cluster node), then — only if the result
 * is still above `hardNodeCap` — shrinks the largest kept groups further
 * until it fits, marking `truncated`.
 */
export function clusterGroups(
  groups: ReadonlyMap<string, GroupMembers>,
  opts: ClusterPassOptions
): ClusterPassResult {
  const kept = new Map<string, string[]>(); // groupKey -> kept member ids
  const hidden = new Map<string, string[]>(); // groupKey -> hidden member ids

  for (const [key, group] of groups) {
    const expanded = opts.expandedGroupKeys.has(key);
    if (!expanded && group.memberIds.length > opts.groupClusterThreshold) {
      kept.set(key, group.memberIds.slice(0, opts.groupKeepCount));
      hidden.set(key, group.memberIds.slice(opts.groupKeepCount));
    } else {
      kept.set(key, [...group.memberIds]);
      hidden.set(key, []);
    }
  }

  const countTotal = () => {
    let total = 1; // center
    for (const key of groups.keys()) {
      total += (kept.get(key)?.length ?? 0) + ((hidden.get(key)?.length ?? 0) > 0 ? 1 : 0);
    }
    return total;
  };

  let truncated = false;
  let guard = 0;
  const maxGuard = [...groups.values()].reduce((sum, g) => sum + g.memberIds.length, 0) + 1;
  while (countTotal() > opts.hardNodeCap && guard < maxGuard) {
    guard++;
    // Shrink the currently-largest kept group by one node (move to hidden).
    let largestKey: string | null = null;
    let largestSize = 0;
    for (const [key, ids] of kept) {
      if (ids.length > largestSize) {
        largestSize = ids.length;
        largestKey = key;
      }
    }
    if (!largestKey || largestSize === 0) break; // nothing left to shrink
    truncated = true;
    const keptIds = kept.get(largestKey)!;
    const moved = keptIds.pop()!;
    hidden.get(largestKey)!.push(moved);
  }

  const keptNodeIds = new Set<string>();
  const clusters: ClusterInfo[] = [];
  for (const [key, group] of groups) {
    for (const id of kept.get(key) ?? []) keptNodeIds.add(id);
    const hiddenIds = hidden.get(key) ?? [];
    if (hiddenIds.length > 0) {
      clusters.push({
        id: `cluster:${key}`,
        groupKey: key,
        connectorId: group.connectorId,
        nodeType: group.nodeType,
        count: hiddenIds.length,
        hiddenNodeIds: hiddenIds,
      });
    }
  }

  return { keptNodeIds, clusters, truncated };
}

export function clusterToGraphNode(cluster: ClusterInfo): GraphNode {
  return {
    id: cluster.id,
    type: "cluster",
    name: `+${cluster.count}`,
    parentId: cluster.connectorId,
    clusterCount: cluster.count,
    clusterGroupKey: cluster.groupKey,
  };
}
