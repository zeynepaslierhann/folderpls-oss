"use client";

import { useRef, type CSSProperties } from "react";
import { useInViewport } from "@/lib/motion/use-in-viewport";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/i18n-context";
import { WALKTHROUGH_STEPS } from "./steps-data";
import { StepText } from "./step-text";
import { StepVisual } from "./step-visual";
import { useActiveStep } from "./use-active-step";
import { usePrefersReducedMotion } from "@/lib/motion/use-prefers-reduced-motion";

/** Real-feature scrollytelling: how FolderPls actually works, task by task. */
export function ScrollWalkthrough() {
  const { t } = useI18n();
  const reducedMotion = usePrefersReducedMotion();
  const { activeIndex, setStepRef } = useActiveStep(WALKTHROUGH_STEPS.length);

  const sectionRef = useRef<HTMLDivElement>(null);
  const sectionInView = useInViewport(sectionRef, { rootMargin: "200px 0px" });

  const activeStep = WALKTHROUGH_STEPS[activeIndex] ?? WALKTHROUGH_STEPS[0];

  return (
    <section ref={sectionRef} id="walkthrough" data-ambient className="py-24 bg-muted/20 border-y border-border/60">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <div className="reveal reveal-scale">
            <Badge variant="secondary" className="mb-4">
              {t("landing.walkthrough.badge")}
            </Badge>
          </div>
          <h2 className="reveal reveal-soft text-3xl md:text-5xl font-bold mb-6 tracking-tight">
            {t("landing.walkthrough.title")}
          </h2>
          <p className="reveal text-muted-foreground text-lg leading-relaxed" style={{ "--reveal-i": 1 } as CSSProperties}>
            {t("landing.walkthrough.subtitle")}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-x-16 max-w-5xl mx-auto">
          <div className="relative lg:pl-10">
            {/* Scroll-synced progress rail (desktop): fills as the steps pass. */}
            <div aria-hidden="true" className="absolute left-[1.1rem] top-[20vh] bottom-[20vh] hidden w-px bg-border lg:block">
              <div className="rail-fill bg-brand-flow-y absolute inset-0" />
            </div>
            {WALKTHROUGH_STEPS.map((step, i) => (
              <StepText
                key={step.id}
                ref={setStepRef(i)}
                step={step}
                index={i}
                active={i === activeIndex}
                reducedMotion={reducedMotion}
              />
            ))}
          </div>

          <div className="hidden lg:block relative">
            <div className="sticky top-28 h-[420px] overflow-hidden rounded-2xl border border-border/50 bg-card/40 shadow-xl backdrop-blur-sm">
              <div aria-hidden="true" className="ambient-float pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-ocean/20 blur-3xl" />
              <div aria-hidden="true" className="ambient-float pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-brand-lemon/25 blur-3xl" style={{ "--float-delay": "-4s" } as CSSProperties} />
              {sectionInView && (
                <StepVisual stepId={activeStep.id} reducedMotion={reducedMotion} />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
