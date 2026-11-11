"use client";

import type { CSSProperties } from "react";
import { DocumentIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n/i18n-context";

const LABELS = [
  { text: "Marketing", cls: "bg-brand-ocean/15 text-brand-ocean-ink border-brand-ocean/40" },
  { text: "Q1-2026", cls: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40" },
];

/** A file card that "receives" label chips — position never changes, only tags attach. */
export function TagVisual() {
  const { locale } = useI18n();
  const sameLocation = locale === "tr" ? "Drive'daki konumu aynı" : "Same spot in Drive";

  return (
    <div className="w-full max-w-xs rounded-xl border border-border bg-card shadow-lg p-5" aria-hidden>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
          <DocumentIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">campaign-brief.pdf</p>
          <p className="text-xs text-muted-foreground">{sameLocation}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {LABELS.map((label, i) => (
          <span
            key={label.text}
            className={`motion-pop rounded-full border px-2.5 py-1 text-[11px] font-medium ${label.cls}`}
            style={{ "--enter-i": 3 + i * 3 } as CSSProperties}
          >
            #{label.text}
          </span>
        ))}
      </div>
    </div>
  );
}
