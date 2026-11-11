import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getTranslation, translations } from "@/lib/i18n/i18n";

type Tree = { readonly [key: string]: string | Tree };

function leafKeys(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([k, v]) =>
    typeof v === "string" ? [`${prefix}${k}`] : leafKeys(v, `${prefix}${k}.`),
  );
}

const ROOT = path.resolve(__dirname, "../..");
const SOURCE_DIRS = ["app", "components", "lib"];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|jsx?)$/.test(name) ? [full] : [];
  });
}

describe("i18n", () => {
  const tr = leafKeys(translations.tr as unknown as Tree);
  const en = leafKeys(translations.en as unknown as Tree);

  it("has the same keys in TR and EN (a missing EN key silently shows Turkish)", () => {
    expect(tr.filter((k) => !en.includes(k))).toEqual([]);
    expect(en.filter((k) => !tr.includes(k))).toEqual([]);
  });

  it("resolves every literal t(\"...\") key used in the code, in both locales", () => {
    const used = new Set<string>();
    for (const dir of SOURCE_DIRS) {
      for (const file of sourceFiles(path.join(ROOT, dir))) {
        const src = readFileSync(file, "utf8");
        for (const m of src.matchAll(/\bt\(\s*["'`]([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)["'`]\s*\)/g)) {
          used.add(m[1]);
        }
      }
    }
    const missing = [...used].filter(
      (key) => getTranslation("en", key) === key || getTranslation("tr", key) === key,
    );
    expect(missing).toEqual([]);
  });
});
