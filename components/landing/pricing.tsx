"use client";

import { CheckIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { TransitionLink } from "@/components/motion/transition-link";
import { useI18n } from "@/lib/i18n/i18n-context";

interface PricingProps {
  headingLevel?: "h1" | "h2";
}

/** Tek plan var: ücretsiz. Sayfa kod tabanının gerçekte yaptığını söyler. */
export function Pricing({ headingLevel: Heading = "h2" }: PricingProps) {
  const { t } = useI18n();
  const points = ["landing.free.point1", "landing.free.point2", "landing.free.point3", "landing.free.point4"];

  return (
    <section id="pricing" className="bg-muted/30 py-20">
      <div className="container mx-auto max-w-2xl px-4 text-center">
        <Heading className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">{t("landing.free.title")}</Heading>
        <p className="mb-8 text-lg text-muted-foreground">{t("landing.free.subtitle")}</p>
        <ul className="mx-auto mb-8 max-w-md space-y-3 text-left">
          {points.map((key) => (
            <li key={key} className="flex items-start gap-2">
              <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-brand-ocean" aria-hidden="true" />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
        <Button asChild size="lg" className="bg-brand-lemon font-bold text-brand-dark hover:bg-brand-lemon/90">
          <TransitionLink href="/dashboard">{t("landing.hero.cta")}</TransitionLink>
        </Button>
      </div>
    </section>
  );
}
