import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FILE_TYPE_ICONS } from "@/components/icons/file-types";
import { AudioIcon, DocumentIcon, FileIcon, FolderIcon, ImageIcon, PresentationIcon, SpreadsheetIcon, VideoIcon } from "@/components/icons";
import { getFileIcon } from "@/lib/google-drive/helpers/file-utils";

const ROOT = path.resolve(__dirname, "../..");
const ICON_MODULE = "components/icons/index.ts";
// Paralel kanalın dosyası (otomatik yedek); o dal birleşince @/components/icons'a alınıp buradan silinecek.
const PENDING_MIGRATION = new Set(["components/dashboard/local-data-panel.tsx"]);
// Gerçekten özel çizimler: grafik düğüm şekilleri ve efsanesi ikon değildir.
const CUSTOM_SVG = new Set(["components/dashboard/graph/graph-canvas.tsx", "components/dashboard/graph/graph-legend.tsx"]);

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(path.join(ROOT, dir))) {
      const rel = path.join(dir, name);
      if (statSync(path.join(ROOT, rel)).isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(name)) out.push(rel);
    }
  };
  ["app", "components", "lib"].forEach(walk);
  return out;
}

const files = sourceFiles().map((rel) => ({ rel, text: readFileSync(path.join(ROOT, rel), "utf8") }));

const iconSource = readFileSync(path.join(ROOT, ICON_MODULE), "utf8");
const glyphs = [...iconSource.matchAll(/^\s+(\w+) as (\w+Icon),$/gm)].map((m) => ({ lucide: m[1], name: m[2] }));
const iconNames = new Set(glyphs.map((g) => g.name));

/** Bir dosyada ortak modülden gelen ikon elemanlarının `className` dizgeleri. */
function iconClassNames(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/<(\w+Icon)\b([\s\S]*?)\/?>/g)) {
    if (!iconNames.has(match[1])) continue;
    const className = match[2].match(/className="([^"]*)"/)?.[1];
    if (className) out.push(className);
  }
  return out;
}

const sizeTokens = (className: string) =>
  className.split(/\s+/).filter((token) => /^(?:size|h|w)-/.test(token) && !token.includes("full"));

describe("tek ikon kaynağı", () => {
  it("lucide-react yalnız ortak modülden import edilir", () => {
    const offenders = files
      .filter(({ rel, text }) => rel !== ICON_MODULE && !PENDING_MIGRATION.has(rel) && /from\s+["']lucide-react/.test(text))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  it("ortak modül ad alanı ile alınmaz (ağaç sallama)", () => {
    const offenders = files.filter(({ text }) => /import\s+\*\s+as\s+\w+\s+from\s+["'][^"']*(?:components\/icons|lucide-react)/.test(text));
    expect(offenders.map(({ rel }) => rel)).toEqual([]);
  });

  it("bir kavram tek çizim: aynı lucide ikonu iki adla çıkmaz", () => {
    expect(glyphs.length).toBeGreaterThan(50);
    const seen = glyphs.map((g) => g.lucide);
    expect(seen.filter((name, index) => seen.indexOf(name) !== index)).toEqual([]);
  });

  it("stroke ölçeği sabit: ikonlara strokeWidth verilmez", () => {
    const offenders = files
      .filter(({ rel, text }) => !CUSTOM_SVG.has(rel) && !PENDING_MIGRATION.has(rel) && /strokeWidth=/.test(text))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  it("satır içi kopya svg yok; kalanlar kayıtlı özel çizimler", () => {
    const withSvg = files.filter(({ text }) => /<svg\b/.test(text)).map(({ rel }) => rel);
    expect(withSvg.filter((rel) => !CUSTOM_SVG.has(rel))).toEqual([]);
  });

  it("boyutlar tanımlı ölçekte", () => {
    const SITE = new Set(["3", "3.5", "4", "5", "6"]);
    const PANEL = new Set(["3", "3.5", "4", "8"]);
    const UI = new Set(["2", "3", "3.5", "4"]);
    const offenders: string[] = [];
    for (const { rel, text } of files) {
      const scale = rel.startsWith("components/ui/")
        ? UI
        : rel.startsWith("components/dashboard/") || rel.startsWith("components/shared/") || rel.startsWith("app/(dashboard)/") || rel === "components/error-boundary.tsx"
          ? PANEL
          : SITE;
      for (const className of iconClassNames(text)) {
        for (const token of sizeTokens(className)) {
          if (!scale.has(token.replace(/^(?:size|h|w)-/, ""))) offenders.push(`${rel}: ${token}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("panel ikonları panel renk token'larında", () => {
    const offenders: string[] = [];
    for (const { rel, text } of files) {
      if (!(rel.startsWith("components/dashboard/") || rel.startsWith("app/(dashboard)/"))) continue;
      for (const className of iconClassNames(text)) {
        if (/\btext-(?:muted-foreground|[a-z]+-\d{3})\b/.test(className)) offenders.push(`${rel}: ${className}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("dosya türü eşlemesi", () => {
  it("MIME türleri tek eşlemeden doğru ikona düşer", () => {
    const cases = [
      ["application/vnd.google-apps.folder", FolderIcon],
      ["image/png", ImageIcon],
      ["video/mp4", VideoIcon],
      ["audio/mpeg", AudioIcon],
      ["application/pdf", DocumentIcon],
      ["application/vnd.google-apps.document", DocumentIcon],
      ["application/vnd.google-apps.spreadsheet", SpreadsheetIcon],
      ["application/vnd.google-apps.presentation", PresentationIcon],
      ["application/zip", FileIcon],
    ] as const;
    for (const [mime, icon] of cases) expect(FILE_TYPE_ICONS[getFileIcon(mime)], mime).toBe(icon);
  });
});

describe("tek marka işareti", () => {
  it("logo adresi yalnız lib/brand.ts'te", () => {
    const offenders = files.filter(({ rel, text }) => rel !== "lib/brand.ts" && text.includes("/logo.png")).map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  it("panelin eski 'f' karesi dönmez", () => {
    expect(files.filter(({ text }) => /\bBrandMark\b/.test(text)).map(({ rel }) => rel)).toEqual([]);
  });
});
