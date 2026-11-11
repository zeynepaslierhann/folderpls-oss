"use client";

import type { ReactNode } from "react";
import { ListIcon, FilterIcon, GraphIcon, TagIcon, FolderIcon, FileIcon, CloseIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n/i18n-context";
import { Button } from "@/components/ui/button";
import { TagDot } from "@/components/ui/tag-chip";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GraphNode } from "@/lib/graph";
import type { LabelItem } from "@/lib/types";

export type FilterableNodeType = "folder" | "file" | "label";

interface GraphToolbarProps {
  focusNode: GraphNode | null;
  onClearFocus: () => void;
  depth: 1 | 2;
  onDepthChange: (depth: 1 | 2) => void;
  nodeTypeFilter: ReadonlySet<FilterableNodeType>;
  onToggleNodeType: (type: FilterableNodeType) => void;
  labels: readonly LabelItem[];
  labelFilter: ReadonlySet<string>;
  onToggleLabel: (labelId: string) => void;
  folders: { id: string; name: string }[];
  folderFilter: string | null;
  onFolderFilterChange: (folderId: string | null) => void;
  viewMode: "graph" | "list";
  onViewModeChange: (mode: "graph" | "list") => void;
}

export function GraphToolbar({
  focusNode,
  onClearFocus,
  depth,
  onDepthChange,
  nodeTypeFilter,
  onToggleNodeType,
  labels,
  labelFilter,
  onToggleLabel,
  folders,
  folderFilter,
  onFolderFilterChange,
  viewMode,
  onViewModeChange,
}: GraphToolbarProps) {
  const { t } = useI18n();

  const segment = "flex h-8 shrink-0 items-center overflow-hidden rounded-md border border-control";
  const hiddenTypes = 3 - nodeTypeFilter.size;
  const activeFilters = hiddenTypes + labelFilter.size + (folderFilter ? 1 : 0);
  const typeItems: { type: FilterableNodeType; label: string; icon: ReactNode }[] = [
    { type: "folder", label: t("graphView.folder"), icon: <FolderIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" /> },
    { type: "file", label: t("graphView.file"), icon: <FileIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" /> },
    { type: "label", label: t("graphView.label"), icon: <TagIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" /> },
  ];

  // Tek satır, en fazla dört kontrol: (odak) · derinlik · Filter ▾ · Graph/List.
  // Kapsam ("Personal space") lejantta zaten yazıyor; tür, etiket ve klasör
  // filtreleri tek "Filter" menüsünde (ayrı "Label" anahtarı + "Label filter"
  // düğmesi ikiliği kalktı). 390px'te de tek satıra sığar.
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-4">
      {focusNode && focusNode.type !== "root" ? (
        <span className="inline-flex h-7 min-w-0 items-center gap-1 rounded-md border border-control bg-raised pl-2 pr-0.5 text-sm sm:max-w-56">
          <span className="min-w-0 truncate">
            {t("graphView.focusedOn")} {focusNode.name}
          </span>
          <button
            type="button"
            onClick={onClearFocus}
            className="flex size-6 shrink-0 items-center justify-center rounded-sm text-fg-3 hover:bg-hover hover:text-fg"
            aria-label={t("graphView.clearFocus")}
          >
            <CloseIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </span>
      ) : null}

      <span className="flex-1" />

      <div className={segment} role="group" aria-label={t("graphView.depth")}>
        {([1, 2] as const).map((d) => (
          <SegmentButton key={d} active={depth === d} onClick={() => onDepthChange(d)}>
            {t(d === 1 ? "graphView.depthOne" : "graphView.depthTwo")}
          </SegmentButton>
        ))}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="md" className="shrink-0 gap-2 px-2.5 max-sm:size-10 max-sm:px-0">
            <FilterIcon className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t("dashboard.panel.filter")}</span>
            <span className="sr-only sm:hidden">{t("dashboard.panel.filter")}</span>
            {activeFilters > 0 && <span className="text-sm text-fg-3 tabular-nums max-sm:hidden">{activeFilters}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[70vh] w-56 overflow-y-auto">
          <DropdownMenuLabel>{t("graphView.filterByType")}</DropdownMenuLabel>
          {typeItems.map(({ type, label, icon }) => (
            <DropdownMenuCheckboxItem
              key={type}
              checked={nodeTypeFilter.has(type)}
              onCheckedChange={() => onToggleNodeType(type)}
              onSelect={(e) => e.preventDefault()}
            >
              {icon}
              {label}
            </DropdownMenuCheckboxItem>
          ))}
          {folders.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">
                    {folderFilter ? folders.find((f) => f.id === folderFilter)?.name ?? t("graphView.folderFilter") : t("graphView.allFolders")}
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-72 w-52 overflow-y-auto">
                  <DropdownMenuRadioGroup value={folderFilter ?? ALL} onValueChange={(v) => onFolderFilterChange(v === ALL ? null : v)}>
                    <DropdownMenuRadioItem value={ALL}>{t("graphView.allFolders")}</DropdownMenuRadioItem>
                    {folders.map((f) => (
                      <DropdownMenuRadioItem key={f.id} value={f.id}>
                        <span className="truncate">{f.name}</span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}
          {labels.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t("graphView.labelFilter")}</DropdownMenuLabel>
              {labels.map((label) => (
                <DropdownMenuCheckboxItem
                  key={label.id}
                  checked={labelFilter.has(label.id)}
                  onCheckedChange={() => onToggleLabel(label.id)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {/* Güvenlik: renk yalnız TagDot'un backgroundColor'ı
                      üzerinden (shorthand `background` url(...) kabul ederdi). */}
                  <TagDot color={label.color} className="mr-2" />
                  {label.name}
                </DropdownMenuCheckboxItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className={segment} role="group" aria-label={t("graphView.viewMode")}>
        <SegmentButton active={viewMode === "graph"} onClick={() => onViewModeChange("graph")} label={t("graphView.graphViewMode")}>
          <GraphIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </SegmentButton>
        <SegmentButton active={viewMode === "list"} onClick={() => onViewModeChange("list")} label={t("graphView.listViewMode")}>
          <ListIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </SegmentButton>
      </div>
    </div>
  );
}

const ALL = "__all__";

/**
 * Bölümlü kontrol düğmesi: aktif durum --hover zemin + 500 ağırlık +
 * aria-pressed (yalnız renkle anlatılmaz). `label` verilirse ikon yanında
 * ≥640px'te görünür, her durumda erişilebilir ad olur.
 */
function SegmentButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-full items-center gap-1.5 border-r border-line px-2.5 text-sm max-sm:px-2 last:border-r-0 transition-colors duration-[var(--dur-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        active ? "bg-hover font-medium text-fg" : "text-fg-2 hover:text-fg"
      )}
    >
      {children}
      {label && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}
