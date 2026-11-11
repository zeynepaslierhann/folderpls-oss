"use client";

import { ExpiryIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n/i18n-context";

/** A tag chip that drains and quietly removes itself once its expiry passes. */
export function ExpiryVisual() {
  const { locale } = useI18n();
  const isEn = locale !== "tr";

  return (
    <div className="w-full max-w-xs rounded-xl border border-border bg-card shadow-lg p-5" aria-hidden>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
        <ExpiryIcon className="h-3.5 w-3.5" />
        <span>{isEn ? "Tag · expires" : "Etiket · son kullanma"}</span>
      </div>

      <div className="wt-expire rounded-full border border-brand-lemon/50 bg-brand-lemon/10 px-3 py-1.5 text-xs font-medium text-foreground w-fit">
        #Campaign-Q1 · 24s
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="wt-drain h-full origin-left rounded-full bg-brand-ocean" />
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {isEn ? "The tag removes itself when time's up." : "Süre dolunca etiket kendiliğinden kalkar."}
      </p>
    </div>
  );
}
