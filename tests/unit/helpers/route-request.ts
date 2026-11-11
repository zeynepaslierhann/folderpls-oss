import { NextRequest } from "next/server";

/**
 * Route testleri için ortak istek kurucusu. `body` bir string ise AYNEN
 * gönderilir (bozuk JSON denemeleri için); aksi halde JSON.stringify edilir.
 */
export function makeJsonRequest(
  url: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XmlHttpRequest",
      Authorization: "Bearer test-token",
      ...headers,
    },
    ...(body === undefined
      ? {}
      : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
}
