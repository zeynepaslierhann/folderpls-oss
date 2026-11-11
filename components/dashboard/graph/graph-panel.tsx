"use client";

import { useCallback, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/i18n-context";
import { usePrefersReducedMotion } from "@/lib/motion/use-prefers-reduced-motion";
import { getFocusedSubgraph, type GraphFilters, type GraphNodeType } from "@/lib/graph";
import { useGraphModel } from "./use-graph-model";
import { useGraphLayout } from "./use-graph-layout";
import { GraphToolbar, type FilterableNodeType } from "./graph-toolbar";
import { GraphCanvas } from "./graph-canvas";
import { GraphListView } from "./graph-list-view";
import { GraphLegend } from "./graph-legend";
import { GraphSidePanel } from "./graph-side-panel";
import type { GraphPanelProps } from "./types";

const ALL_FILTERABLE_TYPES: FilterableNodeType[] = ["folder", "file", "label"];

export function GraphPanel(props: GraphPanelProps) {
  const { t } = useI18n();
  const reducedMotion = usePrefersReducedMotion();
  const model = useGraphModel(props);

  const [internalFocusId, setInternalFocusId] = useState<string | null>(null);
  const [depth, setDepth] = useState<1 | 2>(1);
  const [nodeTypeFilter, setNodeTypeFilter] = useState<Set<FilterableNodeType>>(
    () => new Set(ALL_FILTERABLE_TYPES)
  );
  const [labelFilter, setLabelFilter] = useState<Set<string>>(() => new Set());
  const [folderFilterId, setFolderFilterId] = useState<string | null>(null);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(() => new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"graph" | "list">("graph");

  const focusId = props.focusId !== undefined ? props.focusId : internalFocusId;

  const setFocus = useCallback(
    (nodeId: string | null) => {
      if (props.focusId === undefined) setInternalFocusId(nodeId);
      props.onFocusChange?.(nodeId);
    },
    [props]
  );

  const filters: GraphFilters = useMemo(
    () => ({
      nodeTypes: new Set<GraphNodeType>([...nodeTypeFilter, "root"]),
      labelIds: labelFilter.size > 0 ? labelFilter : undefined,
      folderId: folderFilterId,
    }),
    [nodeTypeFilter, labelFilter, folderFilterId]
  );

  const focusResult = useMemo(
    () => getFocusedSubgraph(model, focusId, { depth, filters, expandedGroupKeys }),
    [model, focusId, depth, filters, expandedGroupKeys]
  );

  const positions = useGraphLayout(focusResult);

  const folders = useMemo(
    () =>
      [...model.nodes.values()]
        .filter((n) => n.type === "folder")
        .map((n) => ({ id: n.id, name: n.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [model]
  );

  const focusNode = focusResult.centerId ? (model.nodes.get(focusResult.centerId) ?? null) : null;
  const selectedNode = selectedNodeId
    ? (focusResult.nodes.find((n) => n.id === selectedNodeId) ?? model.nodes.get(selectedNodeId) ?? null)
    : null;

  const handleSelect = useCallback(
    (nodeId: string, nodeType: GraphNodeType) => {
      setSelectedNodeId(nodeId);
      props.onSelectNode?.(nodeId, nodeType);
    },
    [props]
  );

  const handleFocusHere = useCallback(
    (nodeId: string) => {
      setFocus(nodeId);
      setSelectedNodeId(nodeId);
    },
    [setFocus]
  );

  const handleOpen = useCallback(
    (nodeId: string, nodeType: GraphNodeType) => {
      props.onOpenNode?.(nodeId, nodeType);
    },
    [props]
  );

  const handleExpandCluster = useCallback((groupKey: string) => {
    setExpandedGroupKeys((prev) => new Set(prev).add(groupKey));
  }, []);

  const handleToggleNodeType = useCallback((type: FilterableNodeType) => {
    setNodeTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleToggleLabel = useCallback((labelId: string) => {
    setLabelFilter((prev) => {
      const next = new Set(prev);
      if (next.has(labelId)) next.delete(labelId);
      else next.add(labelId);
      return next;
    });
  }, []);

  const isEmpty = model.nodes.size <= 1;

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-canvas">
      <GraphToolbar
        focusNode={focusNode}
        onClearFocus={() => setFocus(model.rootId)}
        depth={depth}
        onDepthChange={setDepth}
        nodeTypeFilter={nodeTypeFilter}
        onToggleNodeType={handleToggleNodeType}
        labels={model.labels}
        labelFilter={labelFilter}
        onToggleLabel={handleToggleLabel}
        folders={folders}
        folderFilter={folderFilterId}
        onFolderFilterChange={setFolderFilterId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 relative overflow-hidden min-w-0">
          {isEmpty ? (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm text-fg-2">{t("graphView.empty")}</p>
            </div>
          ) : viewMode === "graph" ? (
            <GraphCanvas
              nodes={focusResult.nodes}
              edges={focusResult.edges}
              positions={positions}
              centerId={focusResult.centerId}
              selectedId={selectedNodeId}
              onSelect={handleSelect}
              onFocusHere={handleFocusHere}
              onExpandCluster={handleExpandCluster}
              reducedMotion={reducedMotion}
            />
          ) : (
            <GraphListView
              nodes={focusResult.nodes}
              centerId={focusResult.centerId}
              selectedId={selectedNodeId}
              onSelect={handleSelect}
              onExpandCluster={handleExpandCluster}
            />
          )}

          {!isEmpty && viewMode === "graph" && <GraphLegend />}

          {focusResult.truncated && (
            <div role="status" className="absolute left-1/2 top-2 max-w-[90%] -translate-x-1/2 rounded-md bg-raised px-3 py-1.5 text-center text-sm text-warning shadow-pop">
              {t("graphView.truncated")}
            </div>
          )}
        </div>

        {selectedNode && (
          <GraphSidePanel
            node={selectedNode}
            model={model}
            isCenter={selectedNode.id === focusResult.centerId}
            onClose={() => setSelectedNodeId(null)}
            onFocusHere={handleFocusHere}
            onOpen={handleOpen}
            onFocusTarget={handleFocusHere}
          />
        )}
      </div>
    </div>
  );
}
