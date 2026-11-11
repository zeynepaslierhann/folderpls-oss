"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n/i18n-context";
import { useGraphPalette } from "./use-graph-palette";

/** Narrow viewport threshold below which the legend defaults to collapsed
 * (390px iPhone-class widths — a 220px-wide legend would cover roughly half
 * the graph canvas there otherwise). Always user-toggleable regardless of
 * width, this only picks the initial state. */
const NARROW_VIEWPORT_QUERY = "(max-width: 480px)";

export function GraphLegend() {
  const { t } = useI18n();
  const { colors } = useGraphPalette();
  // Starts expanded (matches SSR output — GraphPanel isn't guaranteed to
  // always be mounted through a `dynamic(..., { ssr: false })` wrapper, so
  // this component must be hydration-safe on its own). Deferred like
  // the locale restore in lib/i18n/i18n-context.tsx: reading
  // `window.matchMedia` synchronously inside the effect body and calling
  // setState right away risks a cascading-render warning, so it's pushed
  // to a microtask instead — this only affects the very first paint after
  // hydration, not the screenshot-relevant steady state.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const isNarrow = window.matchMedia(NARROW_VIEWPORT_QUERY).matches;
    if (!isNarrow) return;
    const timer = setTimeout(() => setCollapsed(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="absolute bottom-3 left-3 flex h-8 items-center gap-1.5 rounded-md bg-raised px-3 text-sm text-fg shadow-pop"
        aria-expanded="false"
        aria-label={t("graphView.legendExpand")}
      >
        <span className="font-medium">{t("graphView.legend")}</span>
        <ChevronUpIcon className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="absolute bottom-3 left-3 max-w-56 space-y-1.5 rounded-lg bg-raised px-3 py-2.5 text-sm shadow-pop">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-fg">{t("graphView.legend")}</p>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="flex size-6 shrink-0 items-center justify-center rounded-sm text-fg-3 hover:bg-hover hover:text-fg"
          aria-expanded="true"
          aria-label={t("graphView.legendCollapse")}
        >
          <ChevronDownIcon className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="my-1 h-px bg-line" />

      <LegendRow shape="diamond" color={colors.root} label={t("graphView.root")} />
      <LegendRow shape="rect" color={colors.folder} stroke={colors.folderBorder} label={t("graphView.folder")} />
      <LegendRow shape="circle" color={colors.file} label={t("graphView.file")} />
      <LegendRow shape="hex" color={colors.edgeLabel} label={t("graphView.label")} />
      <LegendRow shape="dashed-circle" color={colors.cluster} label={t("graphView.cluster")} />

      <div className="my-1 h-px bg-line" />

      <div className="flex items-center gap-2">
        <span className="h-0.5 w-4 shrink-0" style={{ backgroundColor: colors.edgeHierarchy }} />
        <span className="text-fg-2">{t("graphView.hierarchy")}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-0 w-4 shrink-0 border-t border-dashed" style={{ borderColor: colors.edgeLabel }} />
        <span className="text-fg-2">{t("graphView.labelLink")}</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="h-0 w-4 shrink-0 border-t border-dashed"
          style={{ borderColor: colors.edgeRelation }}
        />
        <span className="text-fg-2">{t("graphView.relation")}</span>
      </div>
    </div>
  );
}

function LegendRow({
  shape,
  color,
  stroke,
  label,
}: {
  shape: "diamond" | "rect" | "circle" | "hex" | "dashed-circle";
  color: string;
  stroke?: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0" aria-hidden="true">
        {shape === "diamond" && <rect x="2" y="2" width="10" height="10" rx="2" fill={color} transform="rotate(45 7 7)" />}
        {shape === "rect" && <rect x="1.5" y="3.5" width="11" height="7" rx="1.5" fill={color} stroke={stroke} />}
        {shape === "circle" && <circle cx="7" cy="7" r="5" fill={color} />}
        {shape === "hex" && <polygon points="7,1 12,4 12,10 7,13 2,10 2,4" fill={color} />}
        {shape === "dashed-circle" && (
          <circle cx="7" cy="7" r="5" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="2,2" />
        )}
      </svg>
      <span className="text-fg-2">{label}</span>
    </div>
  );
}
