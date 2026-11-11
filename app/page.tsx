"use client";

import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { ProblemSolution } from "@/components/landing/problem-solution";
import { ScrollWalkthrough } from "@/components/landing/walkthrough";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { GraphShowcase } from "@/components/landing/graph-showcase";
import { UseCases } from "@/components/landing/use-cases";
import { TagRibbon } from "@/components/landing/tag-ribbon";
import { DriveLabelsComparison } from "@/components/landing/drive-labels-comparison";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/icons";
import Image from "next/image";
import { useEffect, type CSSProperties } from "react";
import { TransitionLink } from "@/components/motion/transition-link";
import { useI18n } from "@/lib/i18n/i18n-context";
import { HomepageFAQSchema } from "@/components/seo/faq-schema";

function findFragmentSection(fragment: string): HTMLElement | null {
  // querySelector(hash) "#t=…" gibi bölüm olmayan fragment'lerde hata fırlatır; id ile ara.
  try {
    return document.getElementById(decodeURIComponent(fragment.slice(1)));
  } catch {
    // Bozuk yüzde kodlaması: kaydırılacak bölüm yok.
    return null;
  }
}

function scrollToLocationHash() {
  // Check if there's a hash in the URL (from navigation)
  const fragment = window.location.hash;
  if (!fragment) return;

  // Wait a bit for the page to render, then scroll
  window.setTimeout(() => findFragmentSection(fragment)?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
}

export default function Home() {
  const { t } = useI18n();
  useEffect(scrollToLocationHash, []);

  return (
    // Motion is CSS-only (app/motion.css): every animation lives behind
    // prefers-reduced-motion: no-preference (WCAG 2.3.3).
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <HomepageFAQSchema />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <TagRibbon />
        <ProblemSolution />
        <ScrollWalkthrough />
        <GraphShowcase />
        <FeatureGrid />
        <DriveLabelsComparison variant="compact" />
        <UseCases />
        <FAQ />

        <section className="py-24" data-ambient>
          <div className="container mx-auto px-4 text-center">
            <div className="reveal reveal-scale max-w-3xl mx-auto rounded-3xl bg-muted/50 dark:border-brand-dark border dark:bg-brand-dark p-12 md:p-20 relative overflow-hidden shadow-xl">
              {/* Decorative orbs, slowly drifting */}
              <div aria-hidden="true" className="ambient-float absolute -top-24 -left-24 w-64 h-64 bg-brand-lemon rounded-full blur-[100px] opacity-30 dark:opacity-20" style={{ "--float-x": "30px", "--float-y": "20px", "--float-duration": "12s" } as CSSProperties} />
              <div aria-hidden="true" className="ambient-float absolute -bottom-24 -right-24 w-64 h-64 bg-brand-ocean rounded-full blur-[100px] opacity-30 dark:opacity-20" style={{ "--float-x": "-30px", "--float-y": "-20px", "--float-duration": "14s", "--float-delay": "-4s" } as CSSProperties} />

              <div className="relative z-10">
                <Image
                  src="/assets/loading-poster.png"
                  alt=""
                  width={120}
                  height={90}
                  className="ambient-float mx-auto mb-4 h-[90px] w-[120px]"
                  style={{ "--float-y": "-8px", "--float-r": "-3deg", "--float-duration": "5s" } as CSSProperties}
                />
                <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
                  {t("landing.cta.title")}
                </h2>
                <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
                  {t("landing.cta.subtitle")}
                </p>
                <Button size="lg" className="motion-shine group bg-brand-lemon text-brand-dark hover:bg-brand-lemon/90 font-bold text-lg px-8 h-14" asChild>
                  <TransitionLink href="/dashboard">
                    {t("landing.cta.button")}
                    <ArrowRightIcon className="ml-2 h-5 w-5 transition-transform duration-[var(--motion-duration-base)] ease-motion-out group-hover:translate-x-1" aria-hidden="true" />
                  </TransitionLink>
                </Button>
                <p className="mt-6 text-sm text-muted-foreground">
                  {t("landing.cta.note")}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
