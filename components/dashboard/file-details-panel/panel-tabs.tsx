"use client";

import { useI18n } from "@/lib/i18n/i18n-context";
import { cn } from "@/lib/utils";
import type { TabType } from "./types";

interface PanelTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TABS: { id: TabType; key: string }[] = [
  { id: "properties", key: "dashboard.properties" },
  { id: "notes", key: "dashboard.notes" },
  { id: "relations", key: "dashboard.relations" },
];

/** Alt çizgili sekmeler: aktif sekme 2px --fg çizgi + 500 ağırlık (yalnız renk değil). */
export function PanelTabs({ activeTab, onTabChange }: PanelTabsProps) {
  const { t } = useI18n();
  return (
    <div role="tablist" className="flex shrink-0 gap-4 border-b border-line px-4">
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "-mb-px h-10 border-b-2 text-sm transition-colors duration-[var(--dur-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "border-fg font-medium text-fg" : "border-transparent text-fg-2 hover:text-fg"
            )}
          >
            {t(tab.key)}
          </button>
        );
      })}
    </div>
  );
}
