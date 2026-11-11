"use client";

import { ArrowRightIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { TransitionLink } from "@/components/motion/transition-link";

/**
 * Blog yazısı sonu çağrısı. Metin yalnız kodla doğrulanmış olanı söyler: seçtiğin dosyaları etiketler,
 * etikete göre filtreler, dosyayı Drive'da açarsın; ETİKETLEME dosyayı taşımaz (bkz. tests/unit/claim-scan.test.ts).
 */
export const POST_CTA = {
  heading: "Try it on your own Drive",
  body: "FolderPls lets you tag the Drive files you pick, filter by label and open the file in Drive. Tagging never moves your files.",
  label: "Open FolderPls",
  href: "/dashboard",
} as const;

export function PostCta() {
  return (
    <section
      aria-labelledby="post-cta-heading"
      className="border-t border-border/60 bg-brand-ocean/10 py-12"
      data-testid="post-cta"
    >
      <div className="container mx-auto max-w-3xl px-4 text-center">
        <h2 id="post-cta-heading" className="mb-3 text-2xl font-bold tracking-tight">
          {POST_CTA.heading}
        </h2>
        <p className="mx-auto mb-6 max-w-xl text-muted-foreground">{POST_CTA.body}</p>
        <Button asChild size="lg" className="bg-brand-lemon font-bold text-brand-dark hover:bg-brand-lemon/90">
          <TransitionLink href={POST_CTA.href}>
            {POST_CTA.label}
            <ArrowRightIcon className="ml-2 h-4 w-4" aria-hidden="true" />
          </TransitionLink>
        </Button>
      </div>
    </section>
  );
}
