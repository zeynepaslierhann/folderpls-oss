import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import nextConfig from "@/next.config";
import { proxy } from "@/proxy";
import { DRIVE_SCOPES, getDriveScopes } from "@/lib/google-drive/constants";

const root = path.resolve(__dirname, "../..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.(tsx?|mjs)$/.test(name) ? [full] : [];
  });
}

describe("hesapsız, ücretsiz ürün", () => {
  it("eski hesap, ödeme ve organizasyon adresleri panele yönlenir", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];
    for (const source of ["/login", "/signup", "/forgot-password", "/dashboard/ultra", "/dashboard/organization/:path*", "/invite/:path*"]) {
      expect(redirects.find((r) => r.source === source)?.destination, source).toBe("/dashboard/google-drive");
    }
  });

  it("kaldırılan rotalar geri gelmedi", () => {
    for (const dir of ["app/(auth)", "app/(dashboard)/api", "app/dev", "app/invite", "app/api/t", "app/api/cron", "app/api/metrics", "lib/firebase", "lib/billing", "lib/lemonsqueezy", "lib/metrics"]) {
      expect(existsSync(path.join(root, dir)), dir).toBe(false);
    }
  });

  it("Firebase ve ödeme paketleri bağımlılıkta yok, cron yok", () => {
    const pkg = JSON.parse(read("package.json")) as Record<string, Record<string, string>>;
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(deps.filter((d) => /firebase|lemonsqueezy/i.test(d))).toEqual([]);
    expect(JSON.parse(read("vercel.json")).crons).toBeUndefined();
  });

  it("kaynakta firebase ya da lemonsqueezy içe aktarımı yok, seçim değişkeni kalmadı", () => {
    const files = ["app", "components", "lib", "scripts"].flatMap((d) => sources(path.join(root, d)));
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/from\s+["'](firebase|firebase-admin|@lemonsqueezy)/);
      expect(text, file).not.toContain("NEXT_PUBLIC_STORAGE_MODE");
    }
  });

  it("Sentry varsayılan kapalı: DSN yokken CSP'de Sentry adresi yok", async () => {
    const headers = (await nextConfig.headers?.()) ?? [];
    // CSP istek başına nonce ile proxy.ts'ten gelir (lib/security/csp.ts).
    const csp = proxy(new NextRequest("https://app.example.com/")).headers.get("content-security-policy") ?? "";
    const values = [...headers.flatMap((h) => h.headers.map((x) => x.value)), csp].join(" ");
    expect(values).toContain("accounts.google.com");
    expect(values).not.toMatch(/sentry\.io|firebase/i);
  });

  it("OAuth kapsamı yalnız drive.file", () => {
    expect(getDriveScopes()).toBe(DRIVE_SCOPES.FILE_ONLY);
    const files = ["app", "components", "lib"].flatMap((d) => sources(path.join(root, d)));
    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/auth\/drive\.readonly|auth\/drive["'\s]/);
    }
  });
});
