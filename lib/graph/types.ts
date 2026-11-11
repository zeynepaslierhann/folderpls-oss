/**
 * Graph v2 — pure, DOM-free graph model types.
 *
 * `lib/graph` never fetches data. Everything it needs (files, tags, labels,
 * property definitions) is handed in by the caller as plain in-memory values,
 * which keeps the model trivially unit-testable.
 */

import type {
  DriveFile,
  LabelItem,
  PropertyDefinition,
  TaggedItem,
  FileRelation,
} from "@/lib/types";

// ─── Nodes & edges ──────────────────────────────────────────────────────────

export type GraphNodeType = "root" | "folder" | "file" | "label" | "cluster";

export interface GraphNode {
  readonly id: string;
  readonly type: GraphNodeType;
  readonly name: string;
  /** Direct drive parent (folders/files only) — used for folder-scope filtering. */
  readonly parentId?: string;
  /** Present for root/folder/file nodes; lets the UI open/preview in Drive. */
  readonly driveFile?: DriveFile;
  /** Present for label nodes — the label's own color, not a type default. */
  readonly labelColor?: string;
  /** Present only for synthetic type "cluster" nodes. */
  readonly clusterCount?: number;
  /** Present only for synthetic type "cluster" nodes — pass to `expandedGroupKeys` to expand. */
  readonly clusterGroupKey?: string;
}

export type GraphEdgeType = "parent-child" | "file-label" | "file-relation";

export interface GraphEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly type: GraphEdgeType;
  readonly relationType?: FileRelation["relationType"];
}

// ─── Model ──────────────────────────────────────────────────────────────────

export interface GraphModel {
  readonly rootId: string;
  readonly nodes: ReadonlyMap<string, GraphNode>;
  readonly edges: readonly GraphEdge[];
  /** nodeId → ids of directly connected nodes (both edge directions). */
  readonly neighbors: ReadonlyMap<string, readonly string[]>;
  /** itemId → the TaggedItem it came from (labels/properties/notes/relations). */
  readonly taggedById: ReadonlyMap<string, TaggedItem>;
  readonly labels: readonly LabelItem[];
  readonly properties: readonly PropertyDefinition[];
}

export interface GraphModelInput {
  readonly files: readonly DriveFile[];
  readonly taggedItems: readonly TaggedItem[];
  readonly labels: readonly LabelItem[];
  readonly properties?: readonly PropertyDefinition[];
  readonly rootFolderId: string;
  readonly rootFolderName: string;
}

// ─── Filters ────────────────────────────────────────────────────────────────

export interface GraphFilters {
  /** Only keep these node types (root/center are always kept). Undefined = no restriction. */
  readonly nodeTypes?: ReadonlySet<GraphNodeType>;
  /** Only keep files/folders tagged with at least one of these labels. */
  readonly labelIds?: ReadonlySet<string>;
  /** Only keep files/folders that are inside this folder's subtree (ancestor match). */
  readonly folderId?: string | null;
}

// ─── Focus & clustering ─────────────────────────────────────────────────────

export interface ClusterInfo {
  readonly id: string;
  /** Stable key ("<connectorId>::<nodeType>") — pass back in `expandedGroupKeys` to expand. */
  readonly groupKey: string;
  readonly connectorId: string;
  readonly nodeType: GraphNodeType;
  readonly count: number;
  readonly hiddenNodeIds: readonly string[];
}

export interface FocusResult {
  readonly centerId: string | null;
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly clusters: readonly ClusterInfo[];
  /** True if even after clustering the result had to be cut down to the hard cap. */
  readonly truncated: boolean;
}

export interface FocusOptions {
  /** 1 = direct neighbors only, 2 = neighbors-of-neighbors. Default 1. */
  readonly depth?: 1 | 2;
  readonly filters?: GraphFilters;
  /** Group keys the caller has chosen to expand instead of collapsing. */
  readonly expandedGroupKeys?: ReadonlySet<string>;
  /** A same-connector/same-type group collapses once it exceeds this size. Default 40. */
  readonly groupClusterThreshold?: number;
  /** How many real nodes a collapsed group still shows before the cluster node. Default 12. */
  readonly groupKeepCount?: number;
  /** Hard cap on total nodes (real + cluster) rendered. Default 500. */
  readonly hardNodeCap?: number;
}

export const DEFAULT_FOCUS_OPTIONS = {
  depth: 1 as const,
  groupClusterThreshold: 40,
  groupKeepCount: 12,
  hardNodeCap: 500,
};

// ─── Scope descriptor ───────────────────────────────────────────────────────

