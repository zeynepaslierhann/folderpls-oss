"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { ImageIcon, DocumentIcon, VideoIcon, FolderIcon, TagIcon, ExpiryIcon, CheckIcon, MoveRightIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n/i18n-context";

/*
 * Scroll-synced story: a Drive folder hierarchy dissolves into FolderPls' tag
 * layer while the files themselves never move. Driven by one registered CSS
 * property (--morph-p, 0..1) animated on a scroll timeline (app/motion.css);
 * every node derives its own eased progress from it, so the whole scene is
 * transform/opacity only and costs no JS per frame. Browsers without
 * scroll-driven animations get --morph-p from a rAF-throttled scroll listener.
 * Reduced motion: two static frames (before / after) instead of the scrub.
 */

type Tone = "lemon" | "green" | "violet" | "ocean" | "rose";
const TONE: Record<Tone, string> = {
  lemon: "bg-brand-lemon/80 text-brand-dark",
  green: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  violet: "bg-violet-500/15 text-violet-800 dark:text-violet-300",
  ocean: "bg-brand-ocean/30 text-brand-ocean-ink dark:bg-brand-ocean/15 dark:text-sky-100",
  rose: "bg-rose-500/15 text-rose-800 dark:text-rose-300",
};

interface Tag {
  en: string;
  tr: string;
  tone: Tone;
}
const TAGS = {
  q1: { en: "Q1 campaign", tr: "Q1 kampanya", tone: "lemon" },
  approved: { en: "Approved", tr: "Onaylı", tone: "green" },
  draft: { en: "Draft", tr: "Taslak", tone: "violet" },
  acme: { en: "Client · Acme", tr: "Müşteri · Acme", tone: "ocean" },
  expires: { en: "Expires Fri", tr: "Cuma bitiyor", tone: "rose" },
} satisfies Record<string, Tag>;

interface FolderRow {
  kind: "folder";
  name: { en: string; tr: string };
  y0: number;
  depth: number;
}
interface FileRow {
  kind: "file";
  name: string;
  icon: typeof DocumentIcon;
  y0: number;
  depth: number;
  y1: number;
  tags: Tag[];
}

const ROWS: (FolderRow | FileRow)[] = [
  { kind: "folder", name: { en: "Marketing", tr: "Pazarlama" }, y0: 0, depth: 0 },
  { kind: "folder", name: { en: "2024", tr: "2024" }, y0: 1, depth: 1 },
  { kind: "folder", name: { en: "Q1 Campaign", tr: "Q1 Kampanya" }, y0: 2, depth: 2 },
  { kind: "file", name: "hero-banner_final_v3.png", icon: ImageIcon, y0: 3, depth: 3, y1: 1.4, tags: [TAGS.q1, TAGS.approved] },
  { kind: "file", name: "social-post_NEW.png", icon: ImageIcon, y0: 4, depth: 3, y1: 2.4, tags: [TAGS.q1, TAGS.draft, TAGS.expires] },
  { kind: "folder", name: { en: "Old stuff (do not use)", tr: "Eski (kullanma)" }, y0: 5, depth: 2 },
  { kind: "file", name: "brief_copy (2).pdf", icon: DocumentIcon, y0: 6, depth: 3, y1: 3.4, tags: [TAGS.acme] },
  { kind: "folder", name: { en: "Clients", tr: "Müşteriler" }, y0: 7, depth: 1 },
  { kind: "file", name: "teaser_cut2.mp4", icon: VideoIcon, y0: 8, depth: 2, y1: 4.4, tags: [TAGS.acme, TAGS.approved] },
];

const CLOUD: Tag[] = [TAGS.q1, TAGS.approved, TAGS.draft, TAGS.acme, TAGS.expires];

function nodeStyle(vars: Record<string, number | string>): CSSProperties {
  return vars as CSSProperties;
}

function Board({ isTr, className, style }: { isTr: boolean; className: string; style?: CSSProperties }) {
  let folderIndex = 0;
  let fileIndex = 0;
  return (
    <div
      className={`morph-board relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-2xl backdrop-blur-sm ${className}`}
      style={style}
      aria-hidden="true"
    >
      {/* Header: "Google Drive" cross-fades into "FolderPls tag layer" */}
      <div className="relative flex h-11 items-center justify-between border-b border-border/60 bg-muted/40 px-4 text-xs font-semibold">
        <span className="morph-node morph-out flex items-center gap-2" style={nodeStyle({ "--s": 0.3, "--d": 0.15 })}>
          <FolderIcon className="h-4 w-4 text-brand-ocean-ink" />
          {isTr ? "Google Drive · Drive'ım" : "Google Drive · My Drive"}
        </span>
        <span
          className="morph-node morph-in-y absolute inset-y-0 left-4 flex items-center gap-2"
          style={nodeStyle({ "--s": 0.42, "--d": 0.15 })}
        >
          <TagIcon className="h-4 w-4 text-brand-ocean-ink" />
          {isTr ? "FolderPls · etiket katmanı" : "FolderPls · tag layer"}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
          <MoveRightIcon className="h-3 w-3" />
          {isTr ? "taşınan dosya: 0" : "files moved: 0"}
        </span>
      </div>

      <div className="relative px-4 pt-3 sm:px-6" style={{ height: "calc(var(--row-h) * 9.4)" }}>
        {/* Tag cloud row (appears once the folders are gone) */}
        <div
          className="morph-node morph-in-y absolute inset-x-4 top-3 flex flex-wrap gap-1.5 sm:inset-x-6 sm:gap-2"
          style={nodeStyle({ "--s": 0.46, "--d": 0.14 })}
        >
          {CLOUD.map((tag, i) => (
            <span
              key={tag.en}
              className={`morph-node morph-in flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${TONE[tag.tone]}`}
              style={nodeStyle({ "--s": 0.47 + i * 0.03, "--d": 0.1 })}
            >
              {tag.tone === "rose" ? <ExpiryIcon className="h-3 w-3" /> : tag.tone === "green" ? <CheckIcon className="h-3 w-3" /> : <TagIcon className="h-3 w-3" />}
              {isTr ? tag.tr : tag.en}
            </span>
          ))}
        </div>

        {ROWS.map((row) => {
          if (row.kind === "folder") {
            const i = folderIndex++;
            return (
              <div
                key={row.name.en}
                className="morph-node morph-folder absolute left-4 right-4 flex items-center gap-2 text-[13px] font-semibold text-foreground/80 sm:left-6"
                style={nodeStyle({
                  top: `calc(${row.y0} * var(--row-h) + 0.75rem)`,
                  height: "var(--row-h)",
                  "--dx0": row.depth,
                  "--s": 0.1 + i * 0.03,
                  "--d": 0.22,
                })}
              >
                <FolderIcon className="h-4 w-4 shrink-0 fill-brand-ocean/30 text-brand-ocean-ink" />
                <span className="truncate">{isTr ? row.name.tr : row.name.en}</span>
              </div>
            );
          }
          const k = fileIndex++;
          return (
            <div
              key={row.name}
              className="morph-node morph-file absolute left-4 right-4 flex items-center gap-2 sm:left-6 sm:right-6"
              style={nodeStyle({
                top: `calc(${row.y0} * var(--row-h) + 0.75rem)`,
                height: "var(--row-h)",
                "--y0": row.y0,
                "--y1": `calc(${row.y1} + var(--y-shift))`,
                "--dx0": row.depth,
                "--s": 0.18 + k * 0.045,
                "--d": 0.3,
              })}
            >
              <div className="relative flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-1.5">
                {/* Card chrome fades in as the tree row becomes a tagged file */}
                <span className="morph-card-bg absolute inset-0 rounded-lg border border-border/50 bg-background/85 shadow-sm" />
                <row.icon className="relative h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="relative min-w-0 truncate text-[12px] font-medium text-foreground/90">{row.name}</span>
                <span className="relative ml-auto flex shrink-0 gap-1">
                  {row.tags.map((tag, j) => (
                    <span
                      key={tag.en}
                      className={`morph-node morph-in rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${TONE[tag.tone]} ${j > 0 ? "hidden sm:inline-block" : "inline-block"}`}
                      style={nodeStyle({ "--s": 0.56 + k * 0.05 + j * 0.03, "--d": 0.1 })}
                    >
                      {isTr ? tag.tr : tag.en}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          );
        })}

        {/* Outcome line */}
        <div
          className="morph-node morph-in-y absolute inset-x-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-brand-ocean/50 bg-brand-ocean/10 px-3 py-2 text-center text-[12px] font-semibold text-brand-ocean-ink sm:inset-x-6"
          style={nodeStyle({ top: "calc((6.2 + var(--y-shift)) * var(--row-h))", "--s": 0.8, "--d": 0.12 })}
        >
          <CheckIcon className="h-4 w-4 shrink-0" />
          {isTr ? "4 dosya · 5 etiket · Drive'da tek dosya yer değiştirmedi" : "4 files · 5 tags · not a single file moved in Drive"}
        </div>
      </div>
    </div>
  );
}

function supportsScrollTimelines(): boolean {
  return typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("animation-timeline: view()");
}

export function HierarchyToTags() {
  const { locale } = useI18n();
  const isTr = locale === "tr";
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Fallback for browsers without scroll-driven animations: same --morph-p,
  // computed from one rect read per animation frame while scrolling.
  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage || supportsScrollTimelines()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      stage.style.setProperty("--morph-p", p.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const caption = isTr
    ? "Kaydırdıkça klasör ağacı etiket katmanına dönüşüyor. Dosyalar Drive'da olduğu yerde kalıyor."
    : "Scroll and the folder tree turns into a tag layer. The files stay exactly where they are in Drive.";

  return (
    <div className="relative">
      <p className="sr-only">{caption}</p>

      {/* Scroll-scrubbed version */}
      <div ref={trackRef} className="morph-animated morph-track relative h-[175vh] md:h-[200vh]">
        <div className="sticky top-[calc(4rem+6vh)] md:top-[calc(4rem+10vh)]">
          <div ref={stageRef} className="morph-stage mx-auto w-full max-w-2xl">
            <Board isTr={isTr} className="" />
            <p className="mt-4 text-center text-sm text-muted-foreground" aria-hidden="true">
              {caption}
            </p>
          </div>
        </div>
      </div>

      {/* Reduced motion: before / after, no scrubbing */}
      <div className="morph-static mx-auto max-w-5xl gap-6 md:grid-cols-2" aria-hidden="true">
        <div>
          <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isTr ? "Önce: klasör içinde klasör" : "Before: folders inside folders"}
          </div>
          <Board isTr={isTr} className="" style={{ "--morph-p": 0 } as CSSProperties} />
        </div>
        <div>
          <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isTr ? "Sonra: tek bir etiket katmanı" : "After: one tag layer"}
          </div>
          <Board isTr={isTr} className="" style={{ "--morph-p": 1 } as CSSProperties} />
        </div>
      </div>
    </div>
  );
}
