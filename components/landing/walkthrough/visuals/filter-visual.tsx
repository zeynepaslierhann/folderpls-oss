"use client";

import type { CSSProperties } from "react";
import { SearchIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n/i18n-context";

const FILES = [
  { name: "brand-guide.pdf", match: true },
  { name: "logo-v3.svg", match: true },
  { name: "pitch-deck.pptx", match: true },
  { name: "readme.md", match: false },
];

/** Non-matching files slide out as the filter narrows to one tag — transform/opacity only, no reflow. */
export function FilterVisual() {
  const { locale } = useI18n();
  const tagLabel = locale === "tr" ? "#Onaylı" : "#Approved";

  return (
    <div className="w-full max-w-xs rounded-xl border border-border bg-card shadow-lg p-4" aria-hidden>
      <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-1.5 mb-3">
        <SearchIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground">{tagLabel}</span>
      </div>
      <div className="space-y-1.5">
        {FILES.map((f, i) => (
          <div
            key={f.name}
            className={`rounded-md px-2.5 py-2 text-xs text-foreground bg-background/60 ${f.match ? "" : "wt-filter-out"}`}
            style={{ "--enter-i": i * 2 } as CSSProperties}
          >
            {f.name}
          </div>
        ))}
      </div>
    </div>
  );
}
