import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureRouterTransitionStart: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => sentry);

const DSN = "https://publickey@o0.ingest.de.sentry.io/1";

beforeEach(() => {
  vi.resetModules();
  sentry.init.mockReset();
  sentry.captureException.mockReset();
  sentry.captureRouterTransitionStart.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loadSentry / captureClientException (tarayıcı, tembel yükleme)", () => {
  it("DSN yokken SDK ne yüklenir ne başlatılır; yakalama etkisizdir", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    const { loadSentry, captureClientException } = await import("@/lib/monitoring/sentry-client");

    expect(await loadSentry()).toBeNull();
    captureClientException(new Error("boom"));
    await loadSentry();

    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it("DSN varken SDK yalnız BİR kez, dataCollection ve temizleyicilerle başlatılır", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    const { loadSentry } = await import("@/lib/monitoring/sentry-client");
    // resetModules sonrası aynı kayıt defterinden alınmalı (işlev kimliği karşılaştırması).
    const { scrubBreadcrumb, scrubEvent } = await import("@/lib/monitoring/sentry-options");

    await Promise.all([loadSentry(), loadSentry(), loadSentry()]);

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

  it("DSN varken hata sınırı hatayı init SONRASI yakalar", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    const order: string[] = [];
    sentry.init.mockImplementation(() => order.push("init"));
    sentry.captureException.mockImplementation(() => order.push("capture"));
    const { captureClientException } = await import("@/lib/monitoring/sentry-client");
    const error = new Error("render failed");

    captureClientException(error);
    await vi.waitFor(() => expect(sentry.captureException).toHaveBeenCalledWith(error));

    expect(order).toEqual(["init", "capture"]);
  });

  it("SDK parçası yüklenemezse (ağ / içerik engelleyici) sessizce vazgeçer, uygulamayı bozmaz", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    vi.doMock("@sentry/nextjs", () => {
      throw new Error("ChunkLoadError");
    });
    try {
      const { loadSentry, captureClientException } = await import("@/lib/monitoring/sentry-client");

      await expect(loadSentry()).resolves.toBeNull();
      expect(() => captureClientException(new Error("x"))).not.toThrow();
    } finally {
      vi.doMock("@sentry/nextjs", () => sentry);
    }
  });

  it("Sentry.init fırlatırsa da sessizce vazgeçer (işlenmemiş reddetme yok)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    sentry.init.mockImplementation(() => {
      throw new Error("bad options");
    });
    const { loadSentry, captureClientException } = await import("@/lib/monitoring/sentry-client");

    await expect(loadSentry()).resolves.toBeNull();
    expect(() => captureClientException(new Error("x"))).not.toThrow();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });
});

describe("instrumentation-client.ts", () => {
  it("DSN yokken içe aktarmak Sentry.init çağırmaz; geçiş kancası etkisizdir", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    const mod = await import("@/instrumentation-client");

    mod.onRouterTransitionStart("/pricing", "push");
    await vi.waitFor(() => expect(sentry.init).not.toHaveBeenCalled());

    expect(sentry.captureRouterTransitionStart).not.toHaveBeenCalled();
  });

  it("DSN varken SDK başlatılır ve geçişler bildirilir", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    const mod = await import("@/instrumentation-client");

    mod.onRouterTransitionStart("/pricing", "push");

    await vi.waitFor(() => expect(sentry.captureRouterTransitionStart).toHaveBeenCalledWith("/pricing", "push"));
    expect(sentry.init).toHaveBeenCalledTimes(1);
  });
});
