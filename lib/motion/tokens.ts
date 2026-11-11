/**
 * JS mirror of the motion tokens in app/motion.css (the source of truth).
 * Used where CSS can't reach: canvas animations and
 * requestAnimationFrame loops. tests/unit/motion-tokens.test.ts fails if the
 * two drift apart.
 */
export const MOTION_DURATION_MS = {
  instant: 90,
  fast: 160,
  base: 260,
  slow: 480,
  slower: 800,
} as const;

export const MOTION_DISTANCE_PX = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 32,
  xl: 64,
} as const;

/** cubic-bezier control points, same order as CSS. */
export const MOTION_EASE = {
  standard: [0.2, 0, 0, 1],
  out: [0.16, 1, 0.3, 1],
  in: [0.4, 0, 1, 1],
  inOut: [0.65, 0, 0.35, 1],
  spring: [0.34, 1.56, 0.64, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export const MOTION_STAGGER_MS = 60;

/** Smoothstep: the same curve the CSS morph stage uses (t² · (3 − 2t)). */
export function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** easeOutCubic for canvas node travel. */
export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - c, 3);
}

/** Local 0..1 progress of a sub-animation that runs from `start` for `span` of a parent 0..1 progress. */
export function segment(progress: number, start: number, span: number): number {
  if (span <= 0) return progress >= start ? 1 : 0;
  return Math.min(1, Math.max(0, (progress - start) / span));
}
