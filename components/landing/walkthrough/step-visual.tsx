"use client";

import type { StepId } from "./steps-data";
import { PickerVisual } from "./visuals/picker-visual";
import { TagVisual } from "./visuals/tag-visual";
import { ExpiryVisual } from "./visuals/expiry-visual";
import { FilterVisual } from "./visuals/filter-visual";

const VISUALS: Record<StepId, React.ComponentType> = {
  pick: PickerVisual,
  tag: TagVisual,
  expiry: ExpiryVisual,
  filter: FilterVisual,
};

interface StepVisualProps {
  stepId: StepId;
  reducedMotion: boolean;
  /** Only the shared, scroll-driven panel re-enters on step change. */
  animated?: boolean;
}

/**
 * Renders the active step's illustration. Re-keyed per step so the new
 * visual scales/fades in (CSS `.motion-scale-in`, transform/opacity only);
 * its own loops are CSS keyframes too (app/motion.css `wt-*`), which stop
 * under reduced motion.
 */
export function StepVisual({ stepId, reducedMotion, animated = true }: StepVisualProps) {
  const Visual = VISUALS[stepId];

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div key={stepId} className={`w-full flex justify-center ${animated && !reducedMotion ? "motion-scale-in" : ""}`}>
        <Visual />
      </div>
    </div>
  );
}
