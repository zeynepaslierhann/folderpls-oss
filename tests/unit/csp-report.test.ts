import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseCspReports } from "@/lib/security/csp-report";
import { makeJsonRequest } from "./helpers/route-request";

describe("parseCspReports", () => {
  it("reads the legacy application/csp-report shape and strips query strings", () => {
    const out = parseCspReports({
      "csp-report": {
        "document-uri": "https://app.example.com/dashboard?token=secret",
        "violated-directive": "script-src-elem",
        "effective-directive": "script-src-elem",
        "blocked-uri": "https://evil.example/x.js?uid=123",
        disposition: "report",
      },
    });
    expect(out).toEqual([
      {
        directive: "script-src-elem",
        blocked: "https://evil.example/x.js",
        page: "https://app.example.com/dashboard",
        disposition: "report",
      },
    ]);
  });

  it("reads the Reporting API array shape and ignores other report types", () => {
    const out = parseCspReports([
      { type: "deprecation", body: { id: "x" } },
      {
        type: "csp-violation",
        body: {
          documentURL: "https://app.example.com/",
          effectiveDirective: "frame-src",
          blockedURL: "inline",
          disposition: "enforce",
        },
      },
    ]);
    expect(out).toEqual([
      { directive: "frame-src", blocked: "inline", page: "https://app.example.com/", disposition: "enforce" },
    ]);
  });

  it("returns nothing for junk", () => {
    expect(parseCspReports(null)).toEqual([]);
    expect(parseCspReports({ foo: 1 })).toEqual([]);
    expect(parseCspReports([{ type: "csp-violation", body: {} }])).toEqual([]);
  });
});

// Kimliksiz uç: `content-length` başlığı spoof edilebilir; gövde AKIŞLA ve
// gerçek byte sayısıyla sınırlanmalı (auto-tag O1 ile aynı sınıf).
describe("POST /api/csp-report — gövde boyutu", () => {
  const warn = vi.fn();
  vi.doMock("@/lib/logger", () => ({
    logger: { warn: (...a: unknown[]) => warn(...a), error: () => {}, info: () => {}, debug: () => {} },
  }));

  const violation = {
    "csp-report": {
      "document-uri": "https://app.example.com/pricing?x=1",
      "violated-directive": "img-src",
      "effective-directive": "img-src",
      "blocked-uri": "https://evil.example/p.png",
      disposition: "report",
    },
  };

  async function post(body: string, headers: Record<string, string> = {}) {
    const { POST } = await import("@/app/api/csp-report/route");
    return POST(makeJsonRequest("http://localhost/api/csp-report", "POST", body, headers));
  }

  beforeEach(() => warn.mockReset());

  it("geçerli raporu kaydeder ve 204 döner", async () => {
    const res = await post(JSON.stringify(violation));
    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("tavanı aşan gövdeyi yok sayar; sahte küçük content-length işe yaramaz", async () => {
    const huge = JSON.stringify({ ...violation, pad: "x".repeat(40 * 1024) });
    const res = await post(huge, { "content-length": "20" });
    expect(res.status).toBe(204);
    expect(warn).not.toHaveBeenCalled();
  });

  it("tavan aşılınca akışı keser: gövdenin tamamı belleğe okunmaz", async () => {
    const chunk = new TextEncoder().encode("x".repeat(1024));
    let pulls = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        if (pulls > 4096) controller.close();
        else controller.enqueue(chunk);
      },
    });
    const { POST } = await import("@/app/api/csp-report/route");
    const { NextRequest } = await import("next/server");
    const res = await POST(
      new NextRequest("http://localhost/api/csp-report", {
        method: "POST",
        body: stream,
        // Node fetch: akış gövdesi için gerekli.
        duplex: "half",
      } as unknown as ConstructorParameters<typeof NextRequest>[1])
    );
    expect(res.status).toBe(204);
    // 16 KB tavan = ~16 parça; eski kod 4096 parçanın hepsini okurdu.
    expect(pulls).toBeLessThan(100);
  });

  it("bozuk gövdede de 204 döner, hata fırlatmaz", async () => {
    const res = await post("{ not json");
    expect(res.status).toBe(204);
    expect(warn).not.toHaveBeenCalled();
  });
});
