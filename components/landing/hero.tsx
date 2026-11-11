"use client";

import { useCallback, useRef, type CSSProperties, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, ScrollDownIcon, ImageIcon, DocumentIcon, VideoIcon, PresentationIcon, FolderIcon, ExpiryIcon, CheckIcon, TagIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n/i18n-context";
import { TransitionLink } from "@/components/motion/transition-link";
import { HeroCursorGrid } from "./hero-background";

type TagTone = "lemon" | "green" | "violet" | "ocean" | "rose";

const TAG_TONE: Record<TagTone, string> = {
  lemon: "bg-brand-lemon/70 text-brand-dark",
  green: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  violet: "bg-violet-500/15 text-violet-800 dark:text-violet-300",
  ocean: "bg-brand-ocean/30 text-brand-ocean-ink dark:bg-brand-ocean/15 dark:text-sky-100",
  rose: "bg-rose-500/15 text-rose-800 dark:text-rose-300",
};

interface MockFile {
  name: string;
  icon: typeof DocumentIcon;
  tint: string;
  tag: { en: string; tr: string; tone: TagTone };
  drop: { en: string; tr: string; tone: TagTone };
}

const MOCK_FILES: MockFile[] = [
  { name: "hero-banner.png", icon: ImageIcon, tint: "rgb(255 229 0 / 0.4)", tag: { en: "Q4 campaign", tr: "Q4 kampanya", tone: "lemon" }, drop: { en: "Approved", tr: "Onaylı", tone: "green" } },
  { name: "brand-guide.pdf", icon: DocumentIcon, tint: "rgb(155 179 208 / 0.45)", tag: { en: "Brand", tr: "Marka", tone: "ocean" }, drop: { en: "Final", tr: "Final", tone: "green" } },
  { name: "launch-teaser.mp4", icon: VideoIcon, tint: "rgb(167 139 250 / 0.3)", tag: { en: "Q4 campaign", tr: "Q4 kampanya", tone: "lemon" }, drop: { en: "Draft", tr: "Taslak", tone: "violet" } },
  { name: "pitch-deck.key", icon: PresentationIcon, tint: "rgb(52 211 153 / 0.3)", tag: { en: "Client · Acme", tr: "Müşteri · Acme", tone: "ocean" }, drop: { en: "Expires Fri", tr: "Cuma bitiyor", tone: "rose" } },
  { name: "social-post.png", icon: ImageIcon, tint: "rgb(251 113 133 / 0.25)", tag: { en: "Social", tr: "Sosyal", tone: "violet" }, drop: { en: "Q4 campaign", tr: "Q4 kampanya", tone: "lemon" } },
  { name: "invoice-0923.pdf", icon: DocumentIcon, tint: "rgb(251 191 36 / 0.3)", tag: { en: "Finance", tr: "Finans", tone: "ocean" }, drop: { en: "Approved", tr: "Onaylı", tone: "green" } },
];

const SIDEBAR_TAGS: { en: string; tr: string; tone: TagTone }[] = [
  { en: "Q4 campaign", tr: "Q4 kampanya", tone: "lemon" },
  { en: "Approved", tr: "Onaylı", tone: "green" },
  { en: "Draft", tr: "Taslak", tone: "violet" },
  { en: "Client · Acme", tr: "Müşteri · Acme", tone: "ocean" },
  { en: "Expires Fri", tr: "Cuma bitiyor", tone: "rose" },
];

/** Chips orbiting the product mock (desktop): "tags float around your files". */
const FLOATING_CHIPS: {
  en: string;
  tr: string;
  tone: TagTone;
  icon: typeof TagIcon;
  className: string;
  style: CSSProperties;
}[] = [
  { en: "Q4 campaign", tr: "Q4 kampanya", tone: "lemon", icon: TagIcon, className: "-left-10 top-[14%]", style: { "--float-y": "-12px", "--float-r": "-2deg", "--float-duration": "8s", "--parallax-from": "30px", "--parallax-to": "-50px" } as CSSProperties },
  { en: "Approved", tr: "Onaylı", tone: "green", icon: CheckIcon, className: "-right-8 top-[26%]", style: { "--float-y": "10px", "--float-r": "2deg", "--float-duration": "9.5s", "--float-delay": "-2s", "--parallax-from": "10px", "--parallax-to": "-70px" } as CSSProperties },
  { en: "Client · Acme", tr: "Müşteri · Acme", tone: "ocean", icon: FolderIcon, className: "-left-6 bottom-[16%]", style: { "--float-y": "8px", "--float-x": "6px", "--float-duration": "10s", "--float-delay": "-4s", "--parallax-from": "50px", "--parallax-to": "-30px" } as CSSProperties },
  { en: "Expires Fri", tr: "Cuma bitiyor", tone: "rose", icon: ExpiryIcon, className: "-right-12 bottom-[22%]", style: { "--float-y": "-9px", "--float-r": "-1.5deg", "--float-duration": "8.5s", "--float-delay": "-6s", "--parallax-from": "20px", "--parallax-to": "-60px" } as CSSProperties },
];

export function Hero() {
  const { t, locale } = useI18n();
  const tiltRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const isTr = locale === "tr";

  // 3D tilt: pointer position -> two CSS variables, rAF-throttled. The actual
  // motion is a CSS transform transition (compositor only).
  const handlePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || frameRef.current) return;
    const { clientX, clientY, currentTarget } = e;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      const el = tiltRef.current;
      if (!el) return;
      const rect = currentTarget.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width - 0.5;
      const y = (clientY - rect.top) / rect.height - 0.5;
      el.style.setProperty("--ry", `${(x * 9).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-y * 7).toFixed(2)}deg`);
    });
  }, []);
  const handlePointerLeave = useCallback(() => {
    const el = tiltRef.current;
    if (!el) return;
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--rx", "0deg");
  }, []);

  const handleWatchDemoClick = () => {
    document.getElementById("walkthrough")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Accent the last word of the localized title ("… bul." / "… finding.").
  const title = t("landing.hero.title");
  const accentAt = title.lastIndexOf(" ") + 1;
  const titleLead = title.slice(0, accentAt);
  const titleAccent = title.slice(accentAt);

  return (
    <section
      data-ambient
      className="relative min-h-[90vh] flex flex-col items-center justify-center pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden"
    >
      {/* Ambient layers: cursor grid + two slow-drifting brand orbs */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <HeroCursorGrid />
        <div
          className="ambient-float absolute -top-32 left-[8%] h-[26rem] w-[26rem] rounded-full bg-brand-ocean/25 blur-[110px] dark:bg-brand-ocean/15"
          style={{ "--float-x": "40px", "--float-y": "30px", "--float-duration": "16s" } as CSSProperties}
        />
        <div
          className="ambient-float absolute -bottom-40 right-[6%] h-[24rem] w-[24rem] rounded-full bg-brand-lemon/40 blur-[120px] dark:bg-brand-lemon/10"
          style={{ "--float-x": "-36px", "--float-y": "-24px", "--float-duration": "19s", "--float-delay": "-5s" } as CSSProperties}
        />
      </div>

      <div className="container relative z-10 mx-auto px-4 flex flex-col items-center text-center">
        <div className="flex flex-col items-center max-w-4xl mx-auto">
          <div
            className="motion-enter inline-flex items-center rounded-full border border-border/80 dark:border-white/10 px-3 py-1.5 text-sm font-medium bg-background/60 dark:bg-white/5 backdrop-blur-sm text-foreground mb-6 shadow-sm"
            style={{ "--enter-i": 0 } as CSSProperties}
          >
            <span className="relative mr-2 flex h-2 w-2" aria-hidden="true">
              <span className="ambient-float absolute inset-0 rounded-full bg-brand-lemon" style={{ "--float-y": "0px", "--float-duration": "2.4s" } as CSSProperties} />
              <span className="relative h-2 w-2 rounded-full bg-brand-lemon ring-2 ring-brand-lemon/30" />
            </span>
            {isTr ? "Her Google Drive hesabıyla çalışır" : "Works with any Google Drive account"}
          </div>

          {/* h1 + subtitle are the LCP candidates: no opacity/blur entrance,
              they paint with the server HTML (mobile LCP was 6.8 s). */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground max-w-4xl mb-6 leading-[1.1]">
            {titleLead}
            <span className="text-brand-ocean-ink font-[family-name:var(--font-coiny)]">{titleAccent}</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            {t("landing.hero.subtitle")}
          </p>

          <div className="motion-enter flex flex-col gap-4 w-full items-center mb-14 md:mb-16" style={{ "--enter-i": 2 } as CSSProperties}>
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center">
              <Button
                asChild
                size="lg"
                className="motion-shine group bg-brand-lemon text-brand-dark hover:bg-brand-lemon/90 font-bold text-base px-8 h-12"
              >
                <TransitionLink href="/dashboard">
                  {t("landing.hero.cta")}
                  <ArrowRightIcon
                    className="ml-2 h-4 w-4 transition-transform duration-[var(--motion-duration-base)] ease-motion-out group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </TransitionLink>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="group text-base h-12 px-8 border-2 backdrop-blur-sm bg-background/50"
                onClick={handleWatchDemoClick}
              >
                <ScrollDownIcon
                  className="mr-2 h-4 w-4 transition-transform duration-[var(--motion-duration-base)] ease-motion-spring group-hover:scale-125"
                  aria-hidden="true"
                />
                {isTr ? "Nasıl çalışır?" : "See how it works"}
              </Button>
            </div>
            <div className="max-w-xl space-y-1 text-center text-sm text-muted-foreground">
              <p>{t("landing.hero.freeNote")}</p>
              <p>{t("landing.hero.limitNote")}</p>
            </div>
          </div>

          {/* Product mock: enters on load, tilts with the pointer, and leans
              back (scroll-linked) as the hero leaves the viewport. */}
          <div className="hero-exit relative w-full max-w-5xl" aria-hidden="true">
            <div className="motion-enter relative" style={{ "--enter-i": 4, "--enter-y": "40px", "--enter-scale": 0.97 } as CSSProperties}>
              {FLOATING_CHIPS.map((chip) => (
                <div key={chip.en} className={`parallax absolute z-20 hidden lg:block ${chip.className}`} style={chip.style}>
                  <div
                    className={`ambient-float flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md ${TAG_TONE[chip.tone]}`}
                    style={chip.style}
                  >
                    <chip.icon className="h-3.5 w-3.5" />
                    {isTr ? chip.tr : chip.en}
                  </div>
                </div>
              ))}

              <div onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave} className="[perspective:1400px]">
                <div
                  ref={tiltRef}
                  className="hero-tilt relative rounded-2xl border border-border/80 dark:border-white/10 bg-card/50 dark:bg-card/30 shadow-2xl overflow-hidden aspect-[4/3] sm:aspect-[16/10] lg:aspect-[2/1] backdrop-blur-sm"
                >
                  <div
                    className="absolute inset-0"
                    style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--card) / 0.8), hsl(var(--card) / 0.4), rgb(155 179 208 / 0.12))" }}
                  />
                  <div className="absolute inset-3 md:inset-6 bg-card/85 dark:bg-card/90 rounded-xl border border-border/50 shadow-lg flex flex-col overflow-hidden">
                    {/* Mock header */}
                    <div className="h-10 md:h-12 border-b border-border/50 px-3 md:px-4 flex items-center gap-3 bg-muted/30 shrink-0">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-400/90" />
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-400/90" />
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-400/90" />
                      </div>
                      <div className="ml-2 flex h-6 flex-1 max-w-[14rem] items-center gap-2 rounded-md bg-muted/70 px-2 text-[10px] text-muted-foreground">
                        <TagIcon className="h-3 w-3" />
                        {isTr ? "etiket: Q4 kampanya" : "tag: Q4 campaign"}
                      </div>
                      <div className="ml-auto h-6 md:h-8 w-14 md:w-20 rounded-md bg-brand-lemon" />
                    </div>
                    {/* Mock content */}
                    <div className="flex-1 p-3 md:p-5 grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-5 min-h-0">
                      <div className="hidden md:flex col-span-1 border-r border-border/50 pr-5 flex-col gap-2 text-left">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {isTr ? "Etiketler" : "Tags"}
                        </div>
                        {SIDEBAR_TAGS.map((tag, i) => (
                          <div
                            key={tag.en}
                            className={`flex items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-medium ${i === 0 ? "bg-brand-ocean/20" : ""}`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <span className={`h-2 w-2 shrink-0 rounded-full ${TAG_TONE[tag.tone]}`} />
                              {isTr ? tag.tr : tag.en}
                            </span>
                            <span className="text-muted-foreground">{[12, 8, 5, 9, 3][i]}</span>
                          </div>
                        ))}
                      </div>
                      <div className="col-span-1 md:col-span-3 grid grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-4 content-start">
                        {MOCK_FILES.map((file, i) => (
                          <div
                            key={file.name}
                            className={`rounded-lg border border-border/50 bg-background/80 p-2 md:p-2.5 flex-col gap-1.5 text-left transition-transform duration-[var(--motion-duration-base)] ease-motion-out hover:-translate-y-1 ${i >= 4 ? "hidden lg:flex" : "flex"}`}
                          >
                            <div
                              className="flex h-10 sm:h-14 lg:h-16 items-center justify-center rounded"
                              style={{ backgroundImage: `linear-gradient(135deg, ${file.tint}, transparent)` }}
                            >
                              <file.icon className="h-5 w-5 md:h-6 md:w-6 text-foreground/40" />
                            </div>
                            <div className="truncate text-[10px] md:text-[11px] font-medium text-foreground/80">{file.name}</div>
                            <div className="flex flex-wrap gap-1">
                              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${TAG_TONE[file.tag.tone]}`}>
                                {isTr ? file.tag.tr : file.tag.en}
                              </span>
                              <span
                                className={`hero-tag-drop rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${TAG_TONE[file.drop.tone]}`}
                                style={{ "--drop-delay": `${0.4 + i * 0.9}s` } as CSSProperties}
                              >
                                {isTr ? file.drop.tr : file.drop.en}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
