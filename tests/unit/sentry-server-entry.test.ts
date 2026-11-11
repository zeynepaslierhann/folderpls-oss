import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  captureRequestError: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => sentry);

const DSN = "https://publickey@o0.ingest.de.sentry.io/1";

beforeEach(() => {
  vi.resetModules();
  sentry.init.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe.each([
  ["sentry.server.config", () => import("@/sentry.server.config")],
  ["sentry.edge.config", () => import("@/sentry.edge.config")],
])("%s", (_name, load) => {
  it("DSN yokken Sentry.init HİÇ çağrılmaz", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    await load();
    expect(sentry.init).not.toHaveBeenCalled();
  });

  it("DSN varken bir kez, dataCollection/izleme kapalı ve temizleyicilerle başlatılır", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    await load();
    // resetModules sonrası aynı kayıt defterinden alınmalı (işlev kimliği karşılaştırması).
    const { scrubBreadcrumb, scrubEvent } = await import("@/lib/monitoring/sentry-options");
    expect(sentry.init).toHaveBeenCalledTimes(1);
    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: DSN,
        sendDefaultPii: false,
        dataCollection: expect.objectContaining({ userInfo: false, cookies: false, httpBodies: [] }),
        tracesSampleRate: 0,
        beforeSend: scrubEvent,
        beforeBreadcrumb: scrubBreadcrumb,
      }),
    );
  });
});

describe("instrumentation.ts", () => {
  it("register yalnız çalışma zamanına uygun yapılandırmayı yükler; onRequestError SDK kancasıdır", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    const mod = await import("@/instrumentation");

    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    await mod.register();
    expect(sentry.init).toHaveBeenCalledTimes(1);

    vi.stubEnv("NEXT_RUNTIME", "edge");
    await mod.register();
    expect(sentry.init).toHaveBeenCalledTimes(2);

    expect(mod.onRequestError).toBe(sentry.captureRequestError);
  });
});
