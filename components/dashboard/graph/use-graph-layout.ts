"use client";

import { useMemo } from "react";
import { computeLayout, type FocusResult, type LayoutPoint } from "@/lib/graph";

/** Memoized wrapper around `computeLayout` — only re-lays-out when the focused set changes. */
export function useGraphLayout(focusResult: FocusResult): ReadonlyMap<string, LayoutPoint> {
  return useMemo(
    () => computeLayout(focusResult.nodes, focusResult.edges, { centerId: focusResult.centerId ?? undefined }),
    [focusResult]
  );
}
