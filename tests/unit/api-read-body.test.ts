import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { readBodyWithByteLimit } from "@/lib/api/read-body";
import { makeJsonRequest } from "./helpers/route-request";

const URL_ = "http://localhost:3000/api/x";

describe("readBodyWithByteLimit", () => {
  it("reports why it failed: too_large for a cap breach", async () => {
    const r = await readBodyWithByteLimit(
      makeJsonRequest(URL_, "POST", { pad: "x".repeat(2048) }),
      1024
    );
    expect(r).toEqual({ ok: false, reason: "too_large" });
  });

  it("reports read_error when the stream breaks mid-read", async () => {
    const r = await readBodyWithByteLimit(brokenStreamRequest(), 1024);
    expect(r).toEqual({ ok: false, reason: "read_error" });
  });
});

/** İlk parçayı verir, sonra akışı hatayla koparır (istemci bağlantıyı kesti). */
function brokenStreamRequest(): NextRequest {
  let sent = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (!sent) {
        sent = true;
        controller.enqueue(new TextEncoder().encode('{"a":'));
      } else {
        controller.error(new Error("connection reset"));
      }
    },
  });
  return new NextRequest(URL_, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: stream,
    // Node fetch: akış gövdesi için gerekli.
    duplex: "half",
  } as unknown as ConstructorParameters<typeof NextRequest>[1]);
}
