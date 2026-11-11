import { clusterGroups, clusterToGraphNode, groupByConnector, type VisitedInfo } from "./cluster";
import { nodeMatchesFilters } from "./filters";
import { DEFAULT_FOCUS_OPTIONS, type FocusOptions, type FocusResult, type GraphEdge, type GraphModel } from "./types";

const EMPTY_RESULT: FocusResult = { centerId: null, nodes: [], edges: [], clusters: [], truncated: false };

/**
 * The core of the "question-first" view: instead of the whole drive at once,
 * return the focused node plus its 1-2 hop neighborhood, filtered and
 * clustered down to a readable size.
 */
export function getFocusedSubgraph(
  model: GraphModel,
  focusId: string | null | undefined,
  options: FocusOptions = {}
): FocusResult {
  const centerId = focusId ?? (model.nodes.has(model.rootId) ? model.rootId : null);
  if (!centerId || !model.nodes.has(centerId)) return EMPTY_RESULT;

  const depth = options.depth ?? DEFAULT_FOCUS_OPTIONS.depth;
  const filters = options.filters;
  const groupClusterThreshold = options.groupClusterThreshold ?? DEFAULT_FOCUS_OPTIONS.groupClusterThreshold;
  const groupKeepCount = options.groupKeepCount ?? DEFAULT_FOCUS_OPTIONS.groupKeepCount;
  const hardNodeCap = options.hardNodeCap ?? DEFAULT_FOCUS_OPTIONS.hardNodeCap;
  const expandedGroupKeys = options.expandedGroupKeys ?? new Set<string>();

  // ── BFS up to `depth` hops, filters decide what's even reachable ─────────
  const visited = new Map<string, VisitedInfo>([[centerId, { distance: 0, connectorId: centerId }]]);
  let frontier = [centerId];
  for (let d = 1; d <= depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighborId of model.neighbors.get(id) ?? []) {
        if (visited.has(neighborId)) continue;
        const neighborNode = model.nodes.get(neighborId);
        if (!neighborNode) continue;
        if (!nodeMatchesFilters(model, neighborNode, filters)) continue;
        visited.set(neighborId, { distance: d, connectorId: id });
        next.push(neighborId);
      }
    }
    frontier = next;
  }

  // ── Group non-center nodes by connector + type, then cluster oversized groups ──
  const groups = groupByConnector(model, visited, centerId);
  const { keptNodeIds, clusters, truncated } = clusterGroups(groups, {
    groupClusterThreshold,
    groupKeepCount,
    hardNodeCap,
    expandedGroupKeys,
  });

  const renderedIds = new Set<string>([centerId, ...keptNodeIds]);
  const nodes = [...renderedIds].map((id) => model.nodes.get(id)!).concat(clusters.map(clusterToGraphNode));

  const edges: GraphEdge[] = model.edges.filter(
    (edge) => renderedIds.has(edge.source) && renderedIds.has(edge.target)
  );
  for (const cluster of clusters) {
    const inferredType = inferClusterEdgeType(model, cluster.connectorId, cluster.hiddenNodeIds);
    edges.push({
      id: `cluster-edge:${cluster.id}`,
      source: cluster.connectorId,
      target: cluster.id,
      type: inferredType,
    });
  }

  return { centerId, nodes, edges, clusters, truncated };
}

function inferClusterEdgeType(
  model: GraphModel,
  connectorId: string,
  hiddenNodeIds: readonly string[]
): GraphEdge["type"] {
  const hidden = new Set(hiddenNodeIds);
  for (const edge of model.edges) {
    if (edge.source === connectorId && hidden.has(edge.target)) return edge.type;
    if (edge.target === connectorId && hidden.has(edge.source)) return edge.type;
  }
  return "parent-child";
}
