"use client";

import type { CSSProperties } from "react";
import { TransitionLink as Link } from "@/components/motion/transition-link";
import { Button } from "@/components/ui/button";
import { HomeIcon, SearchIcon } from "@/components/icons";
import { BalikOyunu, type BalikTemasi } from "@/components/balik-oyunu";
import { useI18n } from "@/lib/i18n/i18n-context";

// İmza balık oyunu, FolderPls'in shadcn token'larında (hsl(var(--x))) — light/dark
// class değişince (next-themes) oyun da otomatik yeniden renklenir.
const OYUN_TEMASI: BalikTemasi = {
  zemin: "hsl(var(--muted))",
  su: "hsl(var(--background))",
  balik: "hsl(var(--accent))",
  vurgu: "hsl(var(--primary))",
  metin: "hsl(var(--foreground))",
  engel: "hsl(var(--muted-foreground))",
};

export function NotFoundContent() {
  const { t } = useI18n();

  return (
    <>
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          {/* Same motion language as the site: transform-only rise for the
              LCP heading, staggered entrances for the rest. */}
          <h1 className="motion-rise text-6xl md:text-8xl font-bold text-brand-ocean-ink mb-4 tracking-tight">404</h1>
          <h2 className="motion-enter text-2xl md:text-3xl font-bold mb-4" style={{ "--enter-i": 1 } as CSSProperties}>{t("notFound.title")}</h2>
          <p className="motion-enter text-muted-foreground mb-6" style={{ "--enter-i": 2 } as CSSProperties}>{t("notFound.description")}</p>

          <BalikOyunu
            className="motion-enter"
            tema={OYUN_TEMASI}
            rekorAnahtari="folderpls-404-balik-rekor"
            metinler={{
              ipucu: t("notFound.gameHint"),
              basla: t("notFound.gamePlay"),
              tekrar: t("notFound.gamePlayAgain"),
              devam: t("notFound.gameContinue"),
              duraklatildi: t("notFound.gamePaused"),
              oyunBitti: t("notFound.gameOver"),
              skor: t("notFound.gameScore"),
              rekor: t("notFound.gameBest"),
              yeniRekor: t("notFound.gameNewBest"),
              tuvalEtiketi: t("notFound.gameCanvasLabel"),
            }}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="motion-shine bg-brand-lemon text-brand-dark hover:bg-brand-lemon/90">
            <Link href="/">
              <HomeIcon className="mr-2 h-5 w-5" />
              {t("notFound.goHome")}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/features">
              <SearchIcon className="mr-2 h-5 w-5" />
              {t("notFound.browseFeatures")}
            </Link>
          </Button>
        </div>

        <div className="mt-12 pt-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground mb-4">{t("notFound.popularPages")}:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/features" className="motion-underline text-sm text-brand-ocean-ink">
              {t("notFound.features")}
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href="/pricing" className="motion-underline text-sm text-brand-ocean-ink">
              {t("notFound.pricing")}
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href="/about" className="motion-underline text-sm text-brand-ocean-ink">
              {t("notFound.about")}
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href="/contact" className="motion-underline text-sm text-brand-ocean-ink">
              {t("notFound.contact")}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
