import { afterEach, describe, expect, it, vi } from "vitest";

async function loadProductionLogger() {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");
  return (await import("@/lib/logger")).logger;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("logger (server, production)", () => {
  it("emits errors and warnings so API failures are visible in platform logs", async () => {
    const logger = await loadProductionLogger();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.error("Drive token error:", new Error("boom"));
    logger.warn("CSP violation", { directive: "script-src" });
    expect(error).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("keeps info/debug silent", async () => {
    const logger = await loadProductionLogger();
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    logger.info("noise");
    logger.debug("noise");
    expect(info).not.toHaveBeenCalled();
    expect(debug).not.toHaveBeenCalled();
  });

  it("notice() reaches the platform logs at info severity even in production (daily heartbeat)", async () => {
    const logger = await loadProductionLogger();
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.notice("cron finished", { kontrol: 0, uyusmazlik: 0 });
    expect(info).toHaveBeenCalledTimes(1);
    expect(info.mock.calls[0][0]).toContain("[INFO]");
    expect(info.mock.calls[0].slice(1)).toEqual(["cron finished", { kontrol: 0, uyusmazlik: 0 }]);
    // It must never be reported as a warning or an error.
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("notice() still redacts sensitive data", async () => {
    const logger = await loadProductionLogger();
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.notice("done for alice@example.com", { refreshToken: "1//abc" });
    const printed = JSON.stringify(info.mock.calls[0]);
    expect(printed).not.toContain("alice@example.com");
    expect(printed).not.toContain("1//abc");
  });

  it("keeps info silent even after notice() was used", async () => {
    const logger = await loadProductionLogger();
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.notice("heartbeat");
    logger.info("noise");
    expect(info).toHaveBeenCalledTimes(1);
    expect(info.mock.calls[0][1]).toBe("heartbeat");
  });

  it("redacts tokens and e-mail addresses", async () => {
    const logger = await loadProductionLogger();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("failed for alice@example.com with ya29.a0AfH6SMsecret", { refreshToken: "1//abc" });
    const printed = JSON.stringify(error.mock.calls[0]);
    expect(printed).not.toContain("alice@example.com");
    expect(printed).not.toContain("ya29.a0AfH6SMsecret");
    expect(printed).not.toContain("1//abc");
  });
});
