import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { config as proxyConfig, proxy } from "@/proxy";
import nextConfig from "@/next.config";
import {
  CSP_HEADER,
  CSP_REPORT_ONLY_HEADER,
  buildContentSecurityPolicy,
  buildCspDirectives,
  createNonce,
  cspHeaderName,
  sentryIngestOrigin,
} from "@/lib/security/csp";

const root = path.resolve(__dirname, "../..");
const DSN = "https://publickey@o0.ingest.de.sentry.io/1";

function directive(policy: string, name: string): string[] | undefined {
  const found = policy
    .split(";")
    .map((d) => d.trim().split(/\s+/))
    .find(([n]) => n === name);
  return found?.slice(1);
}

function nonceOf(policy: string): string | undefined {
  return directive(policy, "script-src")
    ?.find((s) => s.startsWith("'nonce-"))
    ?.slice("'nonce-".length, -1);
}

function run(url = "https://app.example.com/dashboard", init?: ConstructorParameters<typeof NextRequest>[1]) {
  return proxy(new NextRequest(url, init));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildContentSecurityPolicy (production)", () => {
  const policy = buildContentSecurityPolicy({ nonce: "abc123==", isDev: false });

  it("has no 'unsafe-inline' / 'unsafe-eval' for scripts and no 'unsafe-eval' anywhere", () => {
    const scriptSrc = directive(policy, "script-src") ?? [];
    expect(scriptSrc).toEqual(expect.arrayContaining(["'self'", "'nonce-abc123=='", "'strict-dynamic'"]));
    expect(scriptSrc.some((s) => s.startsWith("'unsafe-"))).toBe(false);
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain("'unsafe-hashes'");
    // script-src-elem / -attr ile script-src'yi gevşeten bir yan kapı yok.
    expect(directive(policy, "script-src-elem")).toBeUndefined();
    expect(directive(policy, "script-src-attr")).toBeUndefined();
    // Joker kaynak yok.
    expect(scriptSrc).not.toContain("*");
    expect(scriptSrc).not.toContain("https:");
  });

  it("keeps style-src free of nonces (a nonce would silently disable its 'unsafe-inline')", () => {
    expect(directive(policy, "style-src")?.some((s) => s.startsWith("'nonce-"))).toBe(false);
  });

  it("locks framing, base, plugins and form targets", () => {
    expect(directive(policy, "frame-ancestors")).toEqual(["'none'"]);
    expect(directive(policy, "base-uri")).toEqual(["'self'"]);
    expect(directive(policy, "object-src")).toEqual(["'none'"]);
    expect(directive(policy, "form-action")).toEqual(["'self'"]);
    expect(directive(policy, "default-src")).toEqual(["'self'"]);
  });

  it("allows exactly the Google endpoints the app uses", () => {
    expect(directive(policy, "connect-src")).toEqual([
      "'self'",
      "https://www.googleapis.com",
      "https://oauth2.googleapis.com",
      "https://accounts.google.com",
    ]);
    expect(directive(policy, "frame-src")).toEqual([
      "https://docs.google.com",
      "https://accounts.google.com",
      "https://drive.google.com",
    ]);
    expect(directive(policy, "img-src")).toContain("https://*.googleusercontent.com");
    expect(policy).not.toContain("*.googleapis.com");
    expect(policy).not.toContain("ws:");
  });

  it("reports violations to the CSP endpoint", () => {
    expect(directive(policy, "report-uri")).toEqual(["/api/csp-report"]);
    expect(directive(policy, "report-to")).toEqual(["csp-endpoint"]);
  });
});

describe("buildCspDirectives (dev, Sentry)", () => {
  it("adds 'unsafe-eval' and ws: only for the dev server", () => {
    const dev = buildCspDirectives({ nonce: "n", isDev: true });
    expect(dev["script-src"]).toContain("'unsafe-eval'");
    expect(dev["script-src"]).not.toContain("'unsafe-inline'");
    expect(dev["connect-src"]).toContain("ws:");
  });

  it("allows only the DSN's own ingest origin, and nothing without a DSN", () => {
    expect(buildCspDirectives({ nonce: "n", isDev: false, sentryDsn: DSN })["connect-src"]).toContain(
      "https://o0.ingest.de.sentry.io",
    );
    expect(buildContentSecurityPolicy({ nonce: "n", isDev: false })).not.toMatch(/sentry/i);
    expect(sentryIngestOrigin("not a url")).toBeNull();
    expect(sentryIngestOrigin("http://k@o0.ingest.sentry.io/1")).toBeNull();
    expect(sentryIngestOrigin(undefined)).toBeNull();
  });
});

describe("createNonce", () => {
  it("is 128-bit base64 and unique", () => {
    const seen = new Set(Array.from({ length: 50 }, () => createNonce()));
    expect(seen.size).toBe(50);
    for (const n of seen) expect(n).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  });
});

describe("cspHeaderName (escape hatch)", () => {
  it("enforces by default and only reports with CSP_REPORT_ONLY=1", () => {
    expect(cspHeaderName({})).toBe(CSP_HEADER);
    expect(cspHeaderName({ CSP_REPORT_ONLY: "0" })).toBe(CSP_HEADER);
    expect(cspHeaderName({ CSP_ENFORCE: "0" })).toBe(CSP_HEADER);
    expect(cspHeaderName({ CSP_REPORT_ONLY: "1" })).toBe(CSP_REPORT_ONLY_HEADER);
  });
});

describe("proxy", () => {
  it("sends an enforced CSP whose nonce is fresh on every request and handed to the renderer", () => {
    const a = run();
    const b = run();
    const policyA = a.headers.get(CSP_HEADER)!;
    const policyB = b.headers.get(CSP_HEADER)!;
    expect(policyA).toBeTruthy();
    expect(a.headers.get(CSP_REPORT_ONLY_HEADER)).toBeNull();
    expect(nonceOf(policyA)).toBeTruthy();
    expect(nonceOf(policyA)).not.toBe(nonceOf(policyB));
    expect(policyA).not.toContain("'unsafe-inline' 'strict-dynamic'");
    expect(directive(policyA, "script-src")?.some((s) => s.startsWith("'unsafe-"))).toBe(false);

    // NextResponse.next({ request: { headers } }) istek başlıklarını bu önekle taşır.
    expect(a.headers.get("x-middleware-request-x-nonce")).toBe(nonceOf(policyA));
    expect(a.headers.get("x-middleware-request-content-security-policy")).toBe(policyA);
  });

  it("drops client-supplied CSP headers so they cannot pick the render nonce", () => {
    const res = run("https://app.example.com/", {
      headers: { "content-security-policy-report-only": "script-src 'nonce-attacker'" },
    });
    expect(res.headers.get("x-middleware-request-content-security-policy-report-only")).toBeNull();
    expect(res.headers.get("x-middleware-request-content-security-policy")).not.toContain("attacker");
  });

  it("switches to Report-Only with CSP_REPORT_ONLY=1", () => {
    vi.stubEnv("CSP_REPORT_ONLY", "1");
    const res = run();
    expect(res.headers.get(CSP_HEADER)).toBeNull();
    const policy = res.headers.get(CSP_REPORT_ONLY_HEADER)!;
    expect(nonceOf(policy)).toBe(res.headers.get("x-middleware-request-x-nonce"));
  });

  it("runs on pages but not on API routes, build output or files", () => {
    const [{ source }] = proxyConfig.matcher;
    const re = new RegExp(`^${source}$`);
    for (const p of ["/", "/blog/some-post", "/demo", "/drive-labels-checker", "/dashboard/google-drive", "/tr/gizlilik-politikasi"]) {
      expect(re.test(p), p).toBe(true);
    }
    for (const p of ["/api/csp-report", "/_next/static/chunks/a.js", "/_next/image", "/favicon.ico", "/robots.txt", "/blog/x/og.png", "/manifest.webmanifest"]) {
      expect(re.test(p), p).toBe(false);
    }
  });
});

describe("next.config headers", () => {
  it("no longer sends a static CSP and never makes HTML publicly cacheable", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    for (const rule of rules) {
      for (const h of rule.headers) {
        expect(h.key.toLowerCase(), rule.source).not.toMatch(/^content-security-policy/);
        expect(h.key.toLowerCase(), rule.source).not.toBe("cache-control");
      }
    }
  });
});

// Satır içi ÇALIŞAN her betik nonce taşımalı. JSON-LD (`application/ld+json`) veri bloğudur;
// tarayıcı çalıştırmaz, CSP onu engellemez, nonce gerekmez.
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx|ts)$/.test(name) ? [full] : [];
  });
}

describe("inline scripts (source invariant)", () => {
  const files = ["app", "components", "lib"].flatMap((d) => sourceFiles(path.join(root, d)));

  it("every executable inline <script> passes the request nonce", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const match of src.matchAll(/<script\b([^>]*?)(\/?)>/g)) {
        const attrs = match[1];
        if (!/dangerouslySetInnerHTML/.test(attrs)) continue;
        if (/type="application\/ld\+json"/.test(attrs)) continue;
        if (!/\bnonce=\{nonce\}/.test(attrs)) offenders.push(path.relative(root, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the root layout reads the proxy nonce and hands it to next-themes' inline script", () => {
    const layout = readFileSync(path.join(root, "app/layout.tsx"), "utf8");
    expect(layout).toMatch(/\(await headers\(\)\)\.get\(NONCE_REQUEST_HEADER\)/);
    expect(layout).toMatch(/<ThemeProvider\s+nonce=\{nonce\}/);
  });

  it("third-party scripts are only ever created from code (trusted by 'strict-dynamic')", () => {
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      expect(src, path.relative(root, file)).not.toMatch(/<script\b[^>]*\bsrc=/);
    }
  });
});
