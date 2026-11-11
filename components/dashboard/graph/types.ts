import type { DriveFile, LabelItem, PropertyDefinition, TaggedItem } from "@/lib/types";
import type { GraphNodeType } from "@/lib/graph";

export type { GraphNodeType } from "@/lib/graph";

export interface GraphPanelProps {
  readonly files: DriveFile[];
  readonly taggedItems: TaggedItem[];
  readonly labels: LabelItem[];
  readonly properties?: PropertyDefinition[];
  readonly rootFolderId: string;
  readonly rootFolderName: string;
  /** Which data this graph is showing — personal or org. Never fetched here. */

  /** Controlled focus (e.g. from the app's search); omit to let the panel manage it itself. */
  readonly focusId?: string | null;
  readonly onFocusChange?: (nodeId: string | null) => void;
  /** A node was selected (single click / Enter) — mirrors the old onNodeClick (open details panel). */
  readonly onSelectNode?: (nodeId: string, nodeType: GraphNodeType) => void;
  /** "Drive'da aç" — mirrors the old onNodeDoubleClick (navigate into folder / preview file). */
  readonly onOpenNode?: (nodeId: string, nodeType: GraphNodeType) => void;
}
