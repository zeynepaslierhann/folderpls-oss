"use client";

import { ExternalLinkIcon, FocusIcon, CloseIcon, TagIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n/i18n-context";
import { Button } from "@/components/ui/button";
import { TagChip } from "@/components/ui/tag-chip";
import type { GraphModel, GraphNode, GraphNodeType } from "@/lib/graph";

interface GraphSidePanelProps {
  node: GraphNode;
  model: GraphModel;
  isCenter: boolean;
  onClose: () => void;
  onFocusHere: (nodeId: string) => void;
  onOpen: (nodeId: string, nodeType: GraphNodeType) => void;
  onFocusTarget: (nodeId: string) => void;
}

export function GraphSidePanel({ node, model, isCenter, onClose, onFocusHere, onOpen, onFocusTarget }: GraphSidePanelProps) {
  const { t } = useI18n();
  const tagged = model.taggedById.get(node.id);
  const labels = (tagged?.labels ?? [])
    .map((id) => model.labels.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));
  const properties = tagged?.properties ?? {};
  const propertyEntries = Object.entries(properties).filter(([, v]) => v !== "" && v !== undefined);
  const relations = tagged?.relations ?? [];
  const canOpen = node.type !== "cluster" && node.type !== "label" && Boolean(node.driveFile);

  return (
    <aside className="w-full shrink-0 overflow-y-auto border-l border-line bg-raised sm:w-72">
      <div className="flex items-start justify-between gap-2 border-b border-line p-3">
        <div className="min-w-0">
          <p className="break-words text-base font-semibold text-fg">{node.name}</p>
          <span className="mt-1 inline-flex h-5 items-center rounded-sm border border-line px-1.5 text-xs font-medium text-fg-2">
            {t(`graphView.${node.type}`)}
          </span>
        </div>
        <Button variant="ghost" size="icon-sm" className="shrink-0" onClick={onClose} aria-label={t("common.close")}>
          <CloseIcon className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-3 space-y-4">
        {!isCenter && node.type !== "cluster" && (
          <Button variant="secondary" size="md" className="w-full justify-start gap-2" onClick={() => onFocusHere(node.id)}>
            <FocusIcon className="h-4 w-4" aria-hidden="true" />
            {t("graphView.focusHere")}
          </Button>
        )}
        {canOpen && (
          <Button variant="secondary" size="md" className="w-full justify-start gap-2" onClick={() => onOpen(node.id, node.type)}>
            <ExternalLinkIcon className="h-4 w-4" aria-hidden="true" />
            {t("graphView.openInDrive")}
          </Button>
        )}

        {labels.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-fg-3">
              <TagIcon className="w-3 h-3" /> {t("common.label")}
            </p>
            {/* Güvenlik: bkz. graph-toolbar.tsx'teki aynı yorum
                — `background` yerine `backgroundColor`. */}
            <div className="flex flex-wrap gap-1.5">
              {labels.map((label) => (
                <TagChip key={label.id} name={label.name} color={label.color} />
              ))}
            </div>
          </div>
        )}

        {propertyEntries.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-fg-3">{t("graphView.properties")}</p>
            <div className="space-y-1 text-sm">
              {propertyEntries.map(([key, value]) => {
                const def = model.properties.find((p) => p.id === key);
                return (
                  <div key={key} className="flex justify-between gap-2">
                    <span className="shrink-0 text-fg-2">{def?.name ?? key}</span>
                    <span className="break-words text-right text-fg">{String(value)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {relations.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-fg-3">{t("graphView.relation")}</p>
            <ul className="space-y-1">
              {relations.map((relation) => {
                const target = model.nodes.get(relation.targetFileId);
                if (!target) return null;
                return (
                  <li key={relation.targetFileId}>
                    <button
                      type="button"
                      onClick={() => onFocusTarget(relation.targetFileId)}
                      className="w-full rounded-md px-1.5 py-1 text-left text-sm transition-colors duration-[var(--dur-fast)] hover:bg-hover"
                    >
                      {target.name}
                      {relation.relationType && (
                        <span className="text-fg-2"> · {relation.relationType}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {node.type === "cluster" && (
          <p className="text-sm text-fg-2">{t("graphView.clusterHint")}</p>
        )}
      </div>
    </aside>
  );
}
