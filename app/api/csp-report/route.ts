import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { readBodyWithByteLimit } from "@/lib/api/read-body";
import { parseCspReports } from "@/lib/security/csp-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;

/**
 * CSP violation sink (report-uri / report-to). Unauthenticated by design —
 * browsers send these reports without credentials. It only writes a short,
 * query-string-free summary to the server log ("CSP violation"), never to the
 * database, and always answers 204 so it cannot be used as an oracle.
 */
export async function POST(request: NextRequest) {
  try {
    // `content-length` başlığına güvenilmez (spoof edilebilir / chunked istekte
    // yok): gövde akışla okunur ve gerçek byte sayısı tavanı aşınca kesilir.
    const bodyRead = await readBodyWithByteLimit(request, MAX_BODY_BYTES);
    if (!bodyRead.ok) return new NextResponse(null, { status: 204 });
    for (const v of parseCspReports(JSON.parse(bodyRead.text))) {
      logger.warn("CSP violation", v);
    }
  } catch {
    // Malformed report: ignore.
  }
  return new NextResponse(null, { status: 204 });
}
