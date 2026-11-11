import type { NextRequest } from "next/server";

/**
 * İstek gövdesini bayt tavanıyla okur. `content-length` başlığına güvenilmez:
 * istemci küçük ya da hiç başlık göndererek (chunked transfer, uydurulmuş
 * başlık) kontrolü atlatabilir. Gövde akışla okunur ve toplam bayt `maxBytes`'ı
 * aştığı an okuma durur.
 *
 * Başarısızlık nedeni `reason` ile ayrılır: `too_large` (tavan aşıldı) ile
 * `read_error` (akış okunurken koptu, ör. istemci bağlantıyı yarıda kesti).
 * Kullanan rota: `/api/csp-report`.
 */
export type BodyReadResult =
  | { ok: true; text: string }
  | { ok: false; reason: "too_large" | "read_error" };

export async function readBodyWithByteLimit(
  request: NextRequest,
  maxBytes: number
): Promise<BodyReadResult> {
  const reader = request.body?.getReader();
  if (!reader) {
    // No readable stream (e.g. an empty body, or a runtime that doesn't
    // expose one) — fall back to a plain read, still measuring real bytes.
    const text = await request.text();
    return Buffer.byteLength(text, "utf8") > maxBytes
      ? { ok: false, reason: "too_large" }
      : { ok: true, text };
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    await reader.cancel().catch(() => {});
    return { ok: false, reason: "read_error" };
  }

  const decoder = new TextDecoder();
  let text = "";
  for (const chunk of chunks) text += decoder.decode(chunk, { stream: true });
  text += decoder.decode();
  return { ok: true, text };
}
