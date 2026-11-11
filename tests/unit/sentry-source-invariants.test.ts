import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Kaynak düzeyinde değişmezler: davranış testlerinin (sentry-client.test.ts, sentry-event-flow*.test.ts)
 * göremediği, "yanlış dosyaya yanlış import" türü regresyonlar. Yorum satırları hariç aranır.
 */

const root = path.resolve(__dirname, "../..");
const codeOf = (rel: string) =>
  readFileSync(path.join(root, rel), "utf8")
    .split("\n")
    .filter((line) => {
      const t = line.trimStart();
      return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
    })
    .join("\n");

describe("source invariants (tembel istemci SDK'sı)", () => {
  it("uses no regex lookbehind: iOS Safari < 16.4 cannot even parse the client chunk that contains one", () => {
    for (const file of ["lib/monitoring/sentry-options.ts", "lib/monitoring/sentry-client.ts"]) {
      expect(codeOf(file), file).not.toMatch(/\(\?<[=!]/);
    }
  });

  it("lazy-loads the client SDK through the three-function surface, not the whole @sentry/nextjs namespace", () => {
    // import("@sentry/nextjs") tüm modülü (Replay + Feedback dahil) tembel parçaya çeker.
    expect(codeOf("lib/monitoring/sentry-client.ts")).not.toMatch(/import\(\s*["']@sentry\//);
    expect(codeOf("lib/monitoring/sentry-client.ts")).toMatch(/import\(\s*["']\.\/sentry-sdk["']\s*\)/);
    // sentry-sdk.ts yalnız adlandırılmış yeniden dışa aktarım olmalı (`export *` ve `import * as` yok).
    expect(codeOf("lib/monitoring/sentry-sdk.ts").trim()).toBe(
      'export { init, captureException, captureRouterTransitionStart } from "@sentry/nextjs";',
    );
  });

  it("no client file imports the SDK statically (it would land in every page's first-load JS)", () => {
    // Tarayıcıya giren dosyalar: instrumentation-client, hata sınırları, tembel yükleyici.
    for (const file of [
      "instrumentation-client.ts",
      "app/error.tsx",
      "app/global-error.tsx",
      "lib/monitoring/sentry-client.ts",
    ]) {
      const code = codeOf(file);
      expect(code, file).not.toMatch(/import\s+\*\s+as\s+\w+\s+from\s+["']@sentry\/nextjs["']/);
      expect(code, file).not.toMatch(/import\s+\{[^}]*\}\s+from\s+["']@sentry\/nextjs["']/);
    }
  });

  it("error boundaries report through the lazy loader", () => {
    for (const file of ["app/error.tsx", "app/global-error.tsx"]) {
      expect(codeOf(file), file).toMatch(/captureClientException\(error\)/);
    }
  });

  it("never wires Replay / feedback / a tunnel route anywhere", () => {
    const files = [
      "lib/monitoring/sentry-options.ts",
      "lib/monitoring/sentry-client.ts",
      "lib/monitoring/sentry-sdk.ts",
      "instrumentation.ts",
      "instrumentation-client.ts",
      "sentry.server.config.ts",
      "sentry.edge.config.ts",
      "next.config.ts",
    ];
    for (const file of files) {
      expect(codeOf(file), file).not.toMatch(/replay(Integration|sSession|sOnError)|feedbackIntegration|tunnelRoute\s*:/i);
    }
  });
});
