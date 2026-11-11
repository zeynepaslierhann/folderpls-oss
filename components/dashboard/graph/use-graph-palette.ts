"use client";

import { useTheme } from "next-themes";
import { GRAPH_COLORS, GRAPH_COLORS_DARK, nodeTypeColor, type GraphNodeType } from "@/lib/graph";
import { toTagTone } from "@/lib/tag-tone";

/**
 * Grafik renkleri temaya göre (spec §1.5: düğüm renkleri de toTagTone ile).
 * Etiket düğümleri kayıtlı #RRGGBB'nin sönük tonunu alır; diğer tipler
 * GRAPH_COLORS(_DARK) sabitlerinden.
 */
export function useGraphPalette() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const colors = dark ? GRAPH_COLORS_DARK : GRAPH_COLORS;
  const label = (color?: string | null) => {
    const tone = toTagTone(color ?? null);
    return tone.name === "neutral" && !color ? colors.edgeLabel : dark ? tone.dark : tone.light;
  };
  const node = (type: GraphNodeType, labelColor?: string | null) =>
    type === "label" ? label(labelColor) : nodeTypeColor(type, dark);
  return { dark, colors, node, label };
}
