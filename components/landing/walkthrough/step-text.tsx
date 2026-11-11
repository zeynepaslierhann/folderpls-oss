"use client";

import { forwardRef, useRef } from "react";
import { useInViewport } from "@/lib/motion/use-in-viewport";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { WalkthroughStep } from "./steps-data";
import { StepVisual } from "./step-visual";

interface StepTextProps {
  step: WalkthroughStep;
  index: number;
  active: boolean;
  reducedMotion: boolean;
}

/**
 * One step's text block. Also renders its own inline visual — used on mobile,
 * where there is no sticky shared panel (`lg:hidden`).
 */
export const StepText = forwardRef<HTMLDivElement, StepTextProps>(function StepText(
  { step, index, active, reducedMotion },
  ref
) {
  const { t } = useI18n();
  const Icon = step.icon;
  const base = `landing.walkthrough.steps.${step.id}`;

  // Mobile inline visual: only mounted (and animating) while scrolled near — stays stopped off-screen.
  const mobileVisualRef = useRef<HTMLDivElement>(null);
  const mobileVisualInView = useInViewport(mobileVisualRef, { rootMargin: "200px 0px" });

  return (
    <div
      ref={ref}
      className="flex min-h-[60vh] lg:min-h-[80vh] flex-col justify-center py-10 lg:py-0"
    >
      <div
        className={`max-w-md transition-[opacity,transform] duration-[var(--motion-duration-slow)] ease-motion-out ${
          active ? "opacity-100 translate-x-0" : "opacity-[0.92] lg:-translate-x-1"
        }`}
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center lg:-ml-10">
            <span
              aria-hidden="true"
              className={`absolute inset-0 rounded-full bg-brand-lemon transition-[opacity,transform] duration-[var(--motion-duration-slow)] ease-motion-spring ${
                active ? "opacity-100 scale-100" : "opacity-0 scale-50"
              }`}
            />
            <span
              className={`relative flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold transition-colors duration-[var(--motion-duration-base)] ${
                active ? "border-brand-dark/20 text-brand-dark" : "border-brand-ocean/40 bg-brand-ocean/10 text-brand-ocean-ink"
              }`}
            >
              {index + 1}
            </span>
          </span>
          <Icon className="h-5 w-5 text-brand-ocean-ink" aria-hidden />
        </div>
        <h3 className="text-2xl font-bold mb-3 text-foreground">{t(`${base}.title`)}</h3>
        <p className="text-muted-foreground leading-relaxed">{t(`${base}.desc`)}</p>
      </div>

      {/* Fixed height: mounting the visual on scroll must not move the text (CLS). */}
      <div ref={mobileVisualRef} className="mt-8 flex h-[230px] items-center justify-center lg:hidden" aria-hidden>
        {(mobileVisualInView || reducedMotion) && (
          <StepVisual stepId={step.id} reducedMotion={reducedMotion} animated={false} />
        )}
      </div>
    </div>
  );
});
