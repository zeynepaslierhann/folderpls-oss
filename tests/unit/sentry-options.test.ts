import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";
import {
  getSentryOptions,
  maskSensitive,
  sanitizeUrl,
  scrubBreadcrumb,
  scrubEvent,
  stripAttributeValues,
  stripUrlQuery,
} from "@/lib/monitoring/sentry-options";

afterEach(() => {
  vi.unstubAllEnvs();
});

// ErrorEvent'te zorunlu `type` alanını doldurur; testler yalnızca ilgili alanları verir.
const errorEvent = (partial: Omit<Partial<ErrorEvent>, "type">): ErrorEvent =>
  ({ type: undefined, ...partial }) as ErrorEvent;

/** Olay nesnesini gönderim biçimine yakın serileştirir; "hiçbir yerde geçmiyor" iddiaları için. */
const wire = (value: unknown) => JSON.stringify(value);

// Sır benzeri örnekler çalışma anında birleştirilir (kaynakta sır deseni olarak görünmesin).
const LINK_TOKEN = ["lnk", "tok", "9fA7xQ2LmN8vR4sT"].join("_");
const OAUTH_CODE = ["4", "0AbCdEfGh-oauth-code"].join("/");
const SAMPLE_JWT = ["eyJhbGciOiJSUzI1NiJ9", "eyJzdWIiOiJ1c2VyMSJ9", "c2lnbmF0dXJlLXZhbHVl"].join(".");

describe("stripUrlQuery", () => {
  it("drops the query string and the fragment", () => {
    expect(stripUrlQuery("https://app.example.com/dashboard?code=abc&x=1#top")).toBe(
      "https://app.example.com/dashboard",
    );
    expect(stripUrlQuery("/api/drive/token?key=AIzaSecret")).toBe("/api/drive/token");
  });

  it("leaves a URL without query or fragment untouched", () => {
    expect(stripUrlQuery("https://app.example.com/pricing")).toBe("https://app.example.com/pricing");
  });
});

describe("sanitizeUrl", () => {
  it("drops query and fragment of absolute and path-only addresses (OAuth code, link token)", () => {
    expect(sanitizeUrl(`https://app.example.com/dashboard/google-drive?code=${OAUTH_CODE}&scope=x#state=y`)).toBe(
      "https://app.example.com/dashboard/google-drive",
    );
    expect(sanitizeUrl(`/files/f1?token=${LINK_TOKEN}`)).toBe("/files/f1");
    expect(sanitizeUrl(`/files/f1#t=${LINK_TOKEN}`)).toBe("/files/f1");
  });

  it("templates the secret path segment of /api/metrics/<slug> (absolute, path-only, with query)", () => {
    const slug = "f3a9c1d27b4e8a60c5d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5";
    expect(sanitizeUrl(`https://app.example.com/api/metrics/${slug}?n=8`)).toBe("https://app.example.com/api/metrics/:slug");
    expect(sanitizeUrl(`/api/metrics/${slug}`)).toBe("/api/metrics/:slug");
    expect(maskSensitive(`GET /api/metrics/${slug}?n=8 500`)).toBe("GET /api/metrics/:slug 500");
    expect(maskSensitive(`fetch https://app.example.com/api/metrics/${slug} failed`)).toBe(
      "fetch https://app.example.com/api/metrics/:slug failed",
    );
    // Komşu rotalar etkilenmez
    expect(sanitizeUrl("/api/admin/sayim?hafta=2026-10-12")).toBe("/api/admin/sayim");
    expect(sanitizeUrl("/api/metricsx/abc")).toBe("/api/metricsx/abc");
  });

  it("drops user:password@ from the origin and leaves clean addresses alone", () => {
    expect(sanitizeUrl("https://user:pass@app.example.com/pricing")).toBe("https://app.example.com/pricing");
    expect(sanitizeUrl("https://app.example.com/pricing")).toBe("https://app.example.com/pricing");
    expect(sanitizeUrl("app:///_next/static/chunks/0a1b2c.js")).toBe("app:///_next/static/chunks/0a1b2c.js");
  });
});

describe("maskSensitive", () => {
  it("masks every email address in a string", () => {
    expect(maskSensitive("auth failed for a.b+c@example.com and d@x.io")).toBe(
      "auth failed for [email] and [email]",
    );
  });

  it("strips the query string and fragment of absolute URLs inside messages", () => {
    expect(
      maskSensitive(
        `fetch failed https://www.googleapis.com/drive/v3/files?key=${"AIza" + "a".repeat(35)}&q=x (reason: ECONNRESET)`,
      ),
    ).toBe("fetch failed https://www.googleapis.com/drive/v3/files (reason: ECONNRESET)");
    expect(maskSensitive(`landed on https://app.example.com/files/f1#t=${LINK_TOKEN} again`)).toBe(
      "landed on https://app.example.com/files/f1 again",
    );
  });

  it("drops the query/fragment of RELATIVE paths in plain text (OAuth code, link token)", () => {
    expect(maskSensitive(`GET /api/drive/callback?code=${OAUTH_CODE} 500`)).toBe("GET /api/drive/callback 500");
    expect(maskSensitive(`redirect to /dashboard/google-drive?code=abc&scope=x failed`)).toBe(
      "redirect to /dashboard/google-drive failed",
    );
    expect(maskSensitive(`opened /files/f1?token=${LINK_TOKEN} (stale)`)).toBe("opened /files/f1 (stale)");
    expect(maskSensitive(`landed on /login#access_token=abc&type=x`)).toBe("landed on /login");
    expect(maskSensitive("fetch (/api/org?name=a) failed")).toBe("fetch (/api/org) failed");
    expect(maskSensitive("GET foo.example.com/auth?code=abc 400")).toBe("GET foo.example.com/auth 400");
  });

  it("does not eat ordinary question marks, fragments without key=value or paths without a query", () => {
    expect(maskSensitive("Is this valid? /pricing is fine")).toBe("Is this valid? /pricing is fine");
    expect(maskSensitive("regex /a+?/ matched")).toBe("regex /a+?/ matched");
    expect(maskSensitive("open /pricing#faq now")).toBe("open /pricing#faq now");
    expect(maskSensitive("Failed to load Rapor Q3?")).toBe("Failed to load Rapor Q3?");
  });

  it("keeps ID token and Google OAuth token masking (JWT, access, refresh, API key)", () => {
    const text = `idToken ${SAMPLE_JWT} key ${"AIza" + "b".repeat(35)} at ya29.A0Xyz rt 1//0gAbC`;
    expect(maskSensitive(text)).toBe("idToken [redacted] key [redacted] at [redacted] rt [redacted]");
  });

  it("stays fast and leaks nothing on huge messages", () => {
    const huge = `${"x".repeat(100_000)} ${SAMPLE_JWT}`;
    const started = Date.now();
    const out = maskSensitive(huge);
    expect(Date.now() - started).toBeLessThan(500);
    expect(out.length).toBeLessThan(4100);
    expect(out).not.toContain(SAMPLE_JWT);
    // Kesim noktasında yarım token kalmasın: bir sözcüğün ortasında bitmez
    expect(out.endsWith("…[truncated]")).toBe(true);
  });

  it("is idempotent", () => {
    const text = `GET /a/b?code=${OAUTH_CODE} by x@y.co with ${SAMPLE_JWT} at https://h.co/p?q=1#z`;
    const once = maskSensitive(text);
    expect(maskSensitive(once)).toBe(once);
  });
});

describe("scrubEvent", () => {
  it("removes Authorization/Cookie headers (any casing), cookies, body and query string", () => {
    const event = errorEvent({
      request: {
        url: "https://app.example.com/api/drive/callback?code=oauth-code",
        query_string: "code=oauth-code",
        cookies: { session: "s3cret" },
        data: { code: "oauth-code", idToken: "id-token" },
        headers: {
          Authorization: "Bearer abc",
          cookie: "session=s3cret",
          "Set-Cookie": "a=b",
          Referer: "https://app.example.com/dashboard?x=1",
          "user-agent": "vitest",
        },
      },
    });

    const out = scrubEvent(event);

    expect(out.request?.url).toBe("https://app.example.com/api/drive/callback");
    expect(out.request?.query_string).toBeUndefined();
    expect(out.request?.cookies).toBeUndefined();
    expect(out.request?.data).toBeUndefined();
    expect(out.request?.headers).toEqual({
      Referer: "https://app.example.com/dashboard",
      "user-agent": "vitest",
    });
  });

  it("keeps only the uid of the user", () => {
    const out = scrubEvent(
      errorEvent({
        user: { id: "uid-1", email: "user@example.com", username: "user1", ip_address: "1.2.3.4" },
      }),
    );
    expect(out.user).toEqual({ id: "uid-1" });
  });

  it("drops a user object that has no uid", () => {
    const out = scrubEvent(errorEvent({ user: { email: "user@example.com" } }));
    expect(out.user).toBeUndefined();
  });

  it("masks emails in the message and in exception values", () => {
    const out = scrubEvent(
      errorEvent({
        message: "message sent to a@b.co",
        exception: { values: [{ type: "Error", value: "no user x@y.com" }, { type: "Error" }] },
      }),
    );
    expect(out.message).toBe("message sent to [email]");
    expect(out.exception?.values?.[0].value).toBe("no user [email]");
  });

  it("passes an event without request or user through", () => {
    const out = scrubEvent(errorEvent({ event_id: "1" }));
    expect(out).toEqual({ type: undefined, event_id: "1" });
  });
});

describe("scrubEvent: SDK 11 additions and stack frame addresses", () => {
  const frameOf = (event: ErrorEvent) => event.exception?.values?.[0].stacktrace?.frames?.[0];

  it("removes IP / location / signature headers in any casing but keeps debugging headers", () => {
    const out = scrubEvent(
      errorEvent({
        request: {
          url: "https://app.example.com/api/csp-report",
          env: { REMOTE_ADDR: "203.0.113.77" },
          headers: {
            "X-Signature": "a1b2c3",
            "X-Forwarded-For": "203.0.113.77",
            "x-real-ip": "203.0.113.77",
            "x-vercel-forwarded-for": "203.0.113.77",
            "x-vercel-ip-city": "Eskisehir",
            "X-Vercel-IP-Country": "TR",
            "cf-connecting-ip": "203.0.113.77",
            forwarded: "for=203.0.113.77",
            "x-goog-api-key": "k",
            "user-agent": "vitest",
            "content-type": "application/json",
            Origin: "https://app.example.com/x?code=abc",
          },
        },
      }),
    );
    expect(out.request?.env).toBeUndefined();
    expect(out.request?.headers).toEqual({
      "user-agent": "vitest",
      "content-type": "application/json",
      Origin: "https://app.example.com/x",
    });
    expect(wire(out)).not.toContain("203.0.113.77");
  });

  it("masks token-like text inside the remaining header values", () => {
    const out = scrubEvent(errorEvent({ request: { headers: { "x-custom": `t ${SAMPLE_JWT}` } } }));
    expect(out.request?.headers?.["x-custom"]).toBe("t [redacted]");
  });

  it("strips the query/fragment from contexts.nextjs.request_path (onRequestError, OAuth ?code=)", () => {
    const out = scrubEvent(
      errorEvent({
        contexts: {
          nextjs: {
            request_path: `/dashboard/google-drive?code=${OAUTH_CODE}&scope=drive#state=1`,
            router_path: "/dashboard/google-drive",
            route_type: "render",
          },
        },
      }),
    );
    expect(out.contexts?.nextjs).toEqual({
      request_path: "/dashboard/google-drive",
      router_path: "/dashboard/google-drive",
      route_type: "render",
    });
    expect(wire(out)).not.toContain("code=");
  });

  it("strips a request_path query even when it has no key=value shape (the text rule would not see it)", () => {
    const out = scrubEvent(
      errorEvent({ contexts: { nextjs: { request_path: `/files/f1?${LINK_TOKEN}#${OAUTH_CODE}` } } }),
    );
    expect((out.contexts?.nextjs as { request_path: string }).request_path).toBe("/files/f1");
  });

  it("strips a query from the transaction name and leaves route templates alone", () => {
    expect(scrubEvent(errorEvent({ transaction: "GET /dashboard/organization/[orgId]" })).transaction).toBe(
      "GET /dashboard/organization/[orgId]",
    );
    expect(scrubEvent(errorEvent({ transaction: `/login?next=%2Fdashboard#t=${LINK_TOKEN}` })).transaction).toBe(
      "/login",
    );
    expect(scrubEvent(errorEvent({ transaction: "GET /api/drive/token?x=1" })).transaction).toBe("GET /api/drive/token");
  });

  it("masks logentry messages and extra / tags / contexts strings, nested", () => {
    const out = scrubEvent(
      errorEvent({
        logentry: { message: "note for a@b.co" },
        extra: { note: "sent to a@b.co", nested: { token: SAMPLE_JWT, list: ["x@y.com"] } },
        tags: { who: "someone@example.com" },
        contexts: { custom: { value: `GET /x?code=${OAUTH_CODE}` } },
      }),
    );
    const json = wire(out);
    for (const leak of ["a@b.co", "x@y.com", "someone@example.com", SAMPLE_JWT, OAUTH_CODE]) {
      expect(json, leak).not.toContain(leak);
    }
  });

  it("drops stack frame local variables", () => {
    const out = scrubEvent(
      errorEvent({
        exception: {
          values: [
            {
              type: "Error",
              value: "x",
              stacktrace: { frames: [{ filename: "a.js", vars: { idToken: SAMPLE_JWT } }] },
            },
          ],
        },
      }),
    );
    expect(frameOf(out)?.vars).toBeUndefined();
    expect(wire(out)).not.toContain(SAMPLE_JWT);
  });

  describe("stack frame addresses (SDK fills the frame of a frameless onerror with the page URL)", () => {
    it("drops query and fragment (OAuth ?code=, link #t=) in filename and abs_path", () => {
      const pageUrl = `https://app.example.com/files/f1?code=${OAUTH_CODE}#t=${LINK_TOKEN}`;
      const out = scrubEvent(
        errorEvent({
          exception: {
            values: [
              {
                type: "Error",
                value: "Script error.",
                stacktrace: { frames: [{ filename: pageUrl, abs_path: pageUrl, function: "?", in_app: true }] },
              },
            ],
          },
        }),
      );
      expect(frameOf(out)?.filename).toBe("https://app.example.com/files/f1");
      expect(frameOf(out)?.abs_path).toBe("https://app.example.com/files/f1");
      expect(wire(out)).not.toMatch(/code=|#t=|lnk_tok|0AbCdEfGh/);
    });

    it("scrubs the module name the Node parser derives from a page URL", () => {
      const out = scrubEvent(
        errorEvent({
          exception: {
            values: [{ stacktrace: { frames: [{ module: `0AdFrameCode#t=${LINK_TOKEN}`, filename: "app:///x.js" }] } }],
          },
        }),
      );
      expect(frameOf(out)?.module).toBe("0AdFrameCode");
      expect(frameOf(out)?.filename).toBe("app:///x.js");
    });

    it("scrubs every exception in a chain and thread stacktraces too", () => {
      const dirty = `https://app.example.com/dashboard/google-drive?code=${OAUTH_CODE}`;
      const out = scrubEvent(
        errorEvent({
          exception: {
            values: [
              { stacktrace: { frames: [{ filename: dirty }] } },
              { stacktrace: { frames: [{ abs_path: dirty }] } },
            ],
          },
          threads: { values: [{ stacktrace: { frames: [{ filename: dirty, abs_path: dirty }] } }] },
        }),
      );
      expect(wire(out)).not.toMatch(/code=|0AbCdEfGh/);
    });

    it("masks an email or token that sits in a frame address", () => {
      const out = scrubEvent(
        errorEvent({
          exception: { values: [{ stacktrace: { frames: [{ filename: `/x/a@b.co/${SAMPLE_JWT}.js` }] } }] },
        }),
      );
      expect(frameOf(out)?.filename).toBe("/x/[email]/[redacted].js");
    });

    it("leaves ordinary bundle/source file names alone (debuggable)", () => {
      const frame = {
        filename: "app:///_next/static/chunks/0a1b2c3d4e5f6.js",
        abs_path: "webpack-internal:///(rsc)/./app/(dashboard)/dashboard/page.tsx",
        module: "app/(dashboard)/dashboard/page",
        function: "DashboardPage",
        lineno: 12,
      };
      const out = scrubEvent(errorEvent({ exception: { values: [{ stacktrace: { frames: [{ ...frame }] } }] } }));
      expect(frameOf(out)).toEqual(frame);
    });

    it("tolerates frames without any address", () => {
      const out = scrubEvent(errorEvent({ exception: { values: [{ stacktrace: { frames: [{ function: "f" }] } }] } }));
      expect(frameOf(out)).toEqual({ function: "f" });
    });
  });

  it("scrubs breadcrumbs that reached the event without passing beforeBreadcrumb", () => {
    const out = scrubEvent(
      errorEvent({
        breadcrumbs: [{ category: "ui.click", message: 'img[alt="Maaş bordrosu.pdf"]' }],
      }),
    );
    expect(out.breadcrumbs?.[0].message).toBe("img[alt]");
  });

  it("Drive callback failure: no body (code + idToken), cookies or query reach the event", () => {
    const out = scrubEvent(
      errorEvent({
        request: {
          url: `https://app.example.com/api/drive/callback?code=${OAUTH_CODE}`,
          method: "POST",
          data: { code: OAUTH_CODE, idToken: SAMPLE_JWT },
          cookies: { session: "s3cret" },
          query_string: `code=${OAUTH_CODE}`,
          headers: { authorization: `Bearer ${SAMPLE_JWT}`, "user-agent": "vitest" },
        },
        message: `exchange failed for ${SAMPLE_JWT}`,
      }),
    );
    const json = wire(out);
    for (const leak of [OAUTH_CODE, SAMPLE_JWT, "s3cret"]) {
      expect(json, leak).not.toContain(leak);
    }
    expect(out.request?.url).toBe("https://app.example.com/api/drive/callback");
  });
});

describe("scrubBreadcrumb", () => {
  it("strips query strings from url/from/to and masks emails in the message", () => {
    const breadcrumb: Breadcrumb = {
      category: "fetch",
      message: "to a@b.co",
      data: {
        url: "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSecret",
        from: "/login?next=%2Fdashboard",
        to: "/dashboard#x",
        status_code: 200,
      },
    };
    const out = scrubBreadcrumb(breadcrumb);
    expect(out.message).toBe("to [email]");
    expect(out.data).toEqual({
      url: "https://identitytoolkit.googleapis.com/v1/accounts:lookup",
      from: "/login",
      to: "/dashboard",
      status_code: 200,
    });
  });
});

describe("scrubBreadcrumb data", () => {
  it("masks other string data fields and keeps non-strings", () => {
    const out = scrubBreadcrumb({ category: "custom", data: { who: "a@b.co", n: 3 } });
    expect(out.data).toEqual({ who: "[email]", n: 3 });
  });

  it("drops raw console arguments (objects such as Drive file lists or token payloads)", () => {
    const out = scrubBreadcrumb({
      category: "console",
      message: "[drive] [object Object]",
      data: { logger: "console", arguments: ["[drive]", { name: "Maaş bordrosu.pdf", idToken: SAMPLE_JWT }] },
    });
    expect(out.data).toEqual({ logger: "console" });
    expect(wire(out)).not.toContain("Maaş");
    expect(wire(out)).not.toContain(SAMPLE_JWT);
  });

  it("drops query strings of navigation / fetch addresses (OAuth code, link token)", () => {
    const out = scrubBreadcrumb({
      category: "navigation",
      data: { from: `/dashboard/google-drive?code=${OAUTH_CODE}`, to: `/files/f1#t=${LINK_TOKEN}` },
    });
    expect(out.data).toEqual({ from: "/dashboard/google-drive", to: "/files/f1" });
  });
});

describe("maskSensitive tokens", () => {
  it("redacts JWTs, Google API keys, OAuth access and refresh tokens", () => {
    const jwt = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1In0.c2lnbmF0dXJl";
    const apiKey = "AIza" + "a".repeat(35);
    const text = `bad token ${jwt} key ${apiKey} at ya29.A0Xyz rt 1//0gAbC`;
    expect(maskSensitive(text)).toBe(
      "bad token [redacted] key [redacted] at [redacted] rt [redacted]"
    );
  });
});

describe("stripAttributeValues", () => {
  it("keeps attribute names but drops their values", () => {
    expect(
      stripAttributeValues(`div.grid > img.thumb[alt="Q3 Rapor.pdf"][title='Q3 Rapor.pdf'][aria-label=Aç]`)
    ).toBe("div.grid > img.thumb[alt][title][aria-label]");
  });
});

describe("scrubBreadcrumb ui events", () => {
  it("removes Drive file names from click breadcrumbs", () => {
    const crumb: Breadcrumb = {
      category: "ui.click",
      message: `div.file-item[title="Maaş bordrosu.pdf"] > img[alt="Maaş bordrosu.pdf"]`,
    };
    expect(scrubBreadcrumb(crumb).message).toBe("div.file-item[title] > img[alt]");
  });

  it("leaves non-ui breadcrumb messages' brackets alone", () => {
    const crumb: Breadcrumb = { category: "console", message: "items[0]=undefined" };
    expect(scrubBreadcrumb(crumb).message).toBe("items[0]=undefined");
  });
});

describe("getSentryOptions", () => {
  it("has no dsn when NEXT_PUBLIC_SENTRY_DSN is not set, so the entry files never call Sentry.init", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    expect(getSentryOptions().dsn).toBeFalsy();
  });

  it("turns tracing and PII off and wires the scrubbers", () => {
    const options = getSentryOptions();
    expect(options.sendDefaultPii).toBe(false);
    expect(options.tracesSampleRate).toBe(0);
    expect(options.beforeSend).toBe(scrubEvent);
    expect(options.beforeBreadcrumb).toBe(scrubBreadcrumb);
  });

  it("switches off every dataCollection default of SDK 11 (sendDefaultPii no longer exists there)", () => {
    const { dataCollection } = getSentryOptions();
    expect(dataCollection).toMatchObject({
      userInfo: false, // user.* ve IP çıkarımı ({{auto}})
      cookies: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
    });
    expect(dataCollection.httpHeaders.response).toBe(false);
    const allowed = dataCollection.httpHeaders.request.allow;
    for (const sensitive of ["cookie", "authorization", "x-signature", "x-forwarded-for", "x-real-ip", "x-vercel-ip-city"]) {
      expect(allowed).not.toContain(sensitive);
    }
  });

  it("does not configure Replay, session replay sampling, extra integrations or a tunnel", () => {
    const options = getSentryOptions() as Record<string, unknown>;
    expect(options).not.toHaveProperty("replaysSessionSampleRate");
    expect(options).not.toHaveProperty("replaysOnErrorSampleRate");
    expect(options).not.toHaveProperty("integrations");
    expect(options).not.toHaveProperty("tunnel");
  });

  it("prefers VERCEL_ENV over NODE_ENV for the environment", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(getSentryOptions().environment).toBe("preview");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "");
    expect(getSentryOptions().environment).toBe(process.env.NODE_ENV);
  });

  it("sets release from VERCEL_GIT_COMMIT_SHA only when present", () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");
    expect("release" in getSentryOptions()).toBe(false);
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abc123");
    expect(getSentryOptions()).toMatchObject({ release: "abc123" });
  });
});

describe("source invariants", () => {
  it("uses no regex lookbehind: iOS Safari < 16.4 cannot even parse the client chunk that contains one", () => {
    // Yorum satırları hariç (dosya başlığındaki uyarı metni "(?<" yazıyor).
    const code = readFileSync(path.resolve(__dirname, "../../lib/monitoring/sentry-options.ts"), "utf8")
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*"))
      .join("\n");
    expect(code).not.toMatch(/\(\?<[=!]/);
  });
});

describe("maskSensitive edge cases from the privacy audit", () => {
  it("drops a #key= tail that follows a quote (invalid selector message)", () => {
    const msg = "Failed to execute 'querySelector' on 'Document': '#t=lnk_tok_SecretFragXYZ' is not a valid selector.";
    const out = maskSensitive(msg);
    expect(out).not.toContain("lnk_tok_SecretFragXYZ");
    expect(out).toContain("is not a valid selector");
  });

  it("leaves plain questions and section anchors alone", () => {
    expect(maskSensitive("Geçerli mi? x = 1 and see #faq")).toBe("Geçerli mi? x = 1 and see #faq");
  });

  it("fully redacts service-account ya29.c. tokens and OAuth authorization codes", () => {
    expect(maskSensitive("token ya29.c.c0ASRK0Gb_secretTail end")).toBe("token [redacted] end");
    expect(maskSensitive('{"code":"4/0AdLIrYeSecretCode123"}')).not.toContain("4/0Ad");
  });
});
