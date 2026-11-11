"use client";

import { GraphRootIcon, TagIcon, MoreIcon } from "@/components/icons";
import { FILE_TYPE_ICONS } from "@/components/icons/file-types";
import { useI18n } from "@/lib/i18n/i18n-context";
import { cn } from "@/lib/utils";
import type { GraphNode, GraphNodeType } from "@/lib/graph";
import { useGraphPalette } from "./use-graph-palette";

interface GraphListViewProps {
  nodes: readonly GraphNode[];
  centerId: string | null;
  selectedId: string | null;
  onSelect: (nodeId: string, nodeType: GraphNodeType) => void;
  onExpandCluster: (groupKey: string) => void;
}

/**
 * The same focused node set as the canvas, as a fully keyboard-navigable
 * (Tab + Enter/Space) list — the accessible alternative to the SVG graph
 * (WCAG: an equivalent, non-visual way to reach the same information).
 */
export function GraphListView({ nodes, centerId, selectedId, onSelect, onExpandCluster }: GraphListViewProps) {
  const { t } = useI18n();

  if (nodes.length === 0) {
    return <p className="p-4 text-sm text-fg-2">{t("graphView.empty")}</p>;
  }

  return (
    <ul className="p-2 space-y-0.5 overflow-y-auto h-full" aria-label={t("graphView.listViewMode")}>
      {nodes.map((node) => {
        const isCenter = node.id === centerId;
        const isCluster = node.type === "cluster";
        return (
          <li key={node.id}>
            <button
              type="button"
              onClick={() =>
                isCluster && node.clusterGroupKey
                  ? onExpandCluster(node.clusterGroupKey)
                  : onSelect(node.id, node.type)
              }
              aria-current={isCenter ? "true" : undefined}
              className={cn(
                "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-base transition-colors duration-[var(--dur-fast)] hover:bg-hover",
                isCenter && "bg-accent-soft font-medium",
                selectedId === node.id && !isCenter && "bg-hover"
              )}
            >
              <NodeTypeIcon type={node.type} labelColor={node.labelColor} />
              <span className="truncate flex-1">{node.name}</span>
              {isCluster && (
                <span className="shrink-0 text-xs text-fg-3">
                  {t("graphView.expand")}
                </span>
              )}
              {isCenter && (
                <span className="shrink-0 text-xs text-fg-3">{t("graphView.focusedOn")}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function NodeTypeIcon({ type, labelColor }: { type: GraphNodeType; labelColor?: string }) {
  const color = useGraphPalette().node(type, labelColor);
  if (type === "cluster") return <MoreIcon className="w-3.5 h-3.5 shrink-0" style={{ color }} />;
  if (type === "label") return <TagIcon className="w-3.5 h-3.5 shrink-0" style={{ color }} />;
  if (type === "root") return <GraphRootIcon className="w-3.5 h-3.5 shrink-0" style={{ color }} />;
  const Icon = FILE_TYPE_ICONS[type === "folder" ? "folder" : "file"];
  return <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />;
}
