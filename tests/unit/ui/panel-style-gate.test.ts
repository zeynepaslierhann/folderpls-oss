/**
 * Panel stil kapısı (spec 2026-10-06 §1 ve Aşama 4 "grep kapısı").
 * package.json korumalı olduğundan ayrı bir `lint:tokens` script'i yerine
 * `npm test` içinde koşar: giriş yapılmış panelde (app/(dashboard)/dashboard,
 * components/dashboard) tema dışı palet, eski spinner/maskot, hover ölçeği,
 * 10–11px metin ve kaldırılan yarıçaplar yeniden girerse test kırılır.
 * Paylaşılan components/shared ve components/ui da taranır (panel onları kullanır).
 * Yorum satırları sayılmaz; istisnalar: Spinner'ın içi, Accordion (pazarlama) ve
 * `html:not([data-fp-app])` ile yalnız pazarlamaya kapsanmış satırlar.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
const SCAN = ["app/(dashboard)/dashboard", "components/dashboard", "components/shared", "components/ui"];
// Spinner'ın kendisi; Accordion yalnız pazarlama SSS'inde (brand-ocean-ink) kullanılır.
const ALLOW = new Set(["components/ui/loading/spinner.tsx", "components/ui/accordion.tsx"]);
// Bu işareti taşıyan satır yalnız pazarlama sitesine kapsanmıştır (panelde html[data-fp-app] vardır).
const MARKETING_ONLY = "html:not([data-fp-app])";

const FORBIDDEN =
  /Loader2|animate-spin|animate-pulse|BrandLoop|hover:scale|text-\[1[01]px\]|brand-ocean|rounded-(xl|2xl|none)\b|\b(red|amber|green|blue|orange|purple|pink|yellow|emerald)-[0-9]{3}\b|motion-(chip|stagger|drop-target|enter|scale-in)\b/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : /\.(tsx?|css)$/.test(name) ? [full] : [];
  });
}

function codeLines(src: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  let inBlock = false;
  src.split("\n").forEach((raw, i) => {
    let text = raw;
    if (inBlock) {
      const end = text.indexOf("*/");
      if (end === -1) return;
      text = text.slice(end + 2);
      inBlock = false;
    }
    text = text.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
    const open = text.indexOf("/*");
    if (open !== -1) {
      inBlock = true;
      text = text.slice(0, open);
    }
    const trimmed = text.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
    text = text.replace(/(^|\s)\/\/.*$/, "");
    out.push({ line: i + 1, text });
  });
  return out;
}

describe("panel stil kapısı", () => {
  it("tema dışı renk, eski yükleme göstergesi ve gereksiz animasyon yok", () => {
    const hits: string[] = [];
    for (const dir of SCAN) {
      for (const file of files(path.join(ROOT, dir))) {
        const rel = path.relative(ROOT, file);
        if (ALLOW.has(rel)) continue;
        for (const { line, text } of codeLines(readFileSync(file, "utf8"))) {
          if (text.includes(MARKETING_ONLY)) continue;
          const m = text.match(FORBIDDEN);
          if (m) hits.push(`${rel}:${line} → ${m[0]}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
