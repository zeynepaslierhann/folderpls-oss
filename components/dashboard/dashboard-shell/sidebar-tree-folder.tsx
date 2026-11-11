"use client";

import type { MouseEvent, ReactNode } from "react";
import { ChevronRightIcon, FolderIcon, FileIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { FolderTreeItem } from "./types";

/** Ağacın her satırına aynen geçen durum ve geri çağrılar. */
export interface FolderTreeShared {
  openIds: Set<string>;
  childrenByFolder?: Record<string, FolderTreeItem[]>;
  toggle: (folderId: string) => void;
  select: (entry: FolderTreeItem) => void;
  activeId?: string | null;
  t: (key: string) => string;
}

interface SidebarTreeFolderProps {
  item: FolderTreeItem;
  tree: FolderTreeShared;
  depth?: number;
}

function RowName({ children }: { children: ReactNode }) {
  return <span className="truncate">{children}</span>;
}

/** Klasör ağacı satırı (spec §2.1): 28px, 12px girinti adımı, ikon --fg-2. */
export function SidebarTreeFolder({ item, tree, depth = 0 }: SidebarTreeFolderProps) {
  const { t } = tree;
  const isExpanded = tree.openIds.has(item.id);
  const visibleChildren = isExpanded ? (tree.childrenByFolder?.[item.id] ?? []) : [];
  const indent = { paddingLeft: depth * 12 };
  const active = tree.activeId === item.id;

  const handleChevronClick = (e: MouseEvent) => {
    e.stopPropagation();
    tree.toggle(item.id);
  };

  return (
    <div>
      <div className="flex h-7 items-center" style={indent}>
        <button
          type="button"
          onClick={handleChevronClick}
          className="flex size-6 shrink-0 items-center justify-center rounded-sm text-fg-3 hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${isExpanded ? t("dashboard.collapse") : t("dashboard.expand")}: ${item.name}`}
          aria-expanded={isExpanded}
        >
          <ChevronRightIcon
            className={cn("h-3.5 w-3.5 transition-transform duration-[var(--dur-fast)]", isExpanded && "rotate-90")}
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          data-close-nav=""
          onClick={() => tree.select(item)}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex h-7 min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            active ? "bg-accent-soft font-medium text-fg" : "text-fg-2 hover:bg-hover hover:text-fg"
          )}
        >
          <FolderIcon className="h-4 w-4 shrink-0 text-fg-2" aria-hidden="true" />
          <RowName>{item.name}</RowName>
        </button>
      </div>
      {visibleChildren.length > 0 && (
        <div>
          {visibleChildren.map((child) =>
            child.isFolder ? (
              <SidebarTreeFolder key={child.id} item={child} tree={tree} depth={depth + 1} />
            ) : (
              <button
                key={child.id}
                type="button"
                data-close-nav=""
                onClick={() => tree.select(child)}
                className="flex h-7 w-full items-center gap-2 rounded-md pr-1.5 text-left text-sm text-fg-2 hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ paddingLeft: (depth + 1) * 12 + 30 }}
              >
                <FileIcon className="h-4 w-4 shrink-0 text-fg-3" aria-hidden="true" />
                <RowName>{child.name}</RowName>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
