import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

/**
 * Tailwind 4.3 varsayılan `--font-sans` yığınını değiştirdi. Bu değer hem
 * `font-sans` sınıfında hem de preflight'ın html seviyesindeki
 * `--default-font-family` değerinde kullanılır; yani tüm uygulamanın temel
 * yazı tipi Tailwind sürümüne bağlı kalırdı. app/globals.css 4.1.18'in yığınını
 * `@theme inline` içinde sabitler. Bu test (a) sabitlemenin yerinde ve doğru
 * olduğunu, (b) Tailwind'in onu gerçekten kullandığını (derlenmiş çıktıda)
 * kilitler. Yığını bilerek değiştirmek isteyen bu testi de günceller.
 */
const PINNED_STACK =
  'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

const globalsPath = path.resolve(__dirname, "../../app/globals.css");
const globals = fs.readFileSync(globalsPath, "utf8");

/** `@theme inline { ... }` bloklarının gövdelerini (iç içe süslü parantezsiz) döner. */
function themeInlineBodies(css: string): string[] {
  const bodies: string[] = [];
  for (const match of css.matchAll(/@theme\s+inline\s*\{/g)) {
    const start = match.index + match[0].length;
    let depth = 1;
    let i = start;
    while (i < css.length && depth > 0) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
      i++;
    }
    bodies.push(css.slice(start, i - 1));
  }
  return bodies;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ").trim();
}

function pinnedDeclaration(): string {
  for (const body of themeInlineBodies(globals)) {
    const withoutComments = body.replace(/\/\*[\s\S]*?\*\//g, "");
    const match = withoutComments.match(/--font-sans:\s*([^;]+);/);
    if (match) return normalize(match[1]);
  }
  throw new Error("--font-sans, app/globals.css içindeki @theme inline bloğunda sabitlenmemiş");
}

describe("Tailwind font-sans yığını sabitlendi (4.1.18 değeri)", () => {
  it("app/globals.css @theme inline içinde 4.1.18 yığınını taşır", () => {
    expect(pinnedDeclaration()).toBe(PINNED_STACK);
  });

  it("yığın 4.3'ün yeni varsayılanını (-apple-system, Roboto, Noto Sans, Arial) içermez", () => {
    const stack = pinnedDeclaration();
    for (const token of ["-apple-system", "BlinkMacSystemFont", "Roboto", "Noto Sans", "Arial", "Helvetica Neue"]) {
      expect(stack).not.toContain(token);
    }
  });

  it("derlenmiş CSS'te font-sans sınıfı ve html varsayılan yazı tipi sabitlenen yığını kullanır", async () => {
    // Yalnız @theme declarasyonunu çıkarıp küçük bir stil sayfasında derle:
    // tüm projeyi taramak yerine Tailwind'in o declarasyonu gerçekten uyguladığını doğrular.
    const css = `@import "tailwindcss";\n@source inline("font-sans");\n@theme inline {\n  --font-sans: ${pinnedDeclaration()};\n}\n`;
    const result = await postcss([tailwindcss()]).process(css, { from: globalsPath });
    const out = normalize(result.css);

    const fontSansRule = out.match(/\.font-sans \{ font-family: ([^;]+);/);
    expect(fontSansRule, ".font-sans kuralı derlenmedi").not.toBeNull();
    expect(normalize(fontSansRule![1])).toBe(PINNED_STACK);

    const defaultFamily = out.match(/--default-font-family: ([^;]+);/);
    expect(defaultFamily, "--default-font-family derlenmedi").not.toBeNull();
    expect(normalize(defaultFamily![1])).toBe(PINNED_STACK);
  }, 30_000);
});
