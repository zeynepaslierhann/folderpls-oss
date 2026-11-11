import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Kaynak yorumlarındaki "bkz. <x>-operations.ts" atıfları gerçek dosyalara
 * işaret etmeli (bakım 2026-10-12, ONAY 7). Ölü kod temizliğinde silinen dosyaya atıf
 * girerse bu test kırmızıya döner.
 */
const root = path.resolve(__dirname, "../..");
const SCAN_DIRS = ["lib", "app", "components"];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe("kaynak atıfları", () => {
  it("anılan her *-operations.ts dosyası var", () => {
    const missing: string[] = [];
    const files = SCAN_DIRS.flatMap((d) => walk(path.join(root, d)));
    const names = new Set(files.map((f) => path.basename(f)));
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/\b([a-z0-9-]+-operations\.ts)\b/g)) {
        if (!names.has(match[1])) {
          missing.push(`${path.relative(root, file)} -> ${match[1]}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
