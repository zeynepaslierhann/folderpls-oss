import { NextResponse, type NextRequest } from "next/server";
import {
  CSP_HEADER,
  CSP_REPORT_ONLY_HEADER,
  NONCE_REQUEST_HEADER,
  buildContentSecurityPolicy,
  createNonce,
  cspHeaderName,
} from "@/lib/security/csp";

/**
 * Her HTML isteğine yeni bir nonce ve sıkı CSP (bkz. lib/security/csp.ts).
 *
 * Next, render sırasında nonce'u İSTEK başlığındaki CSP'den okur ve kendi betiklerine koyar;
 * app/layout.tsx aynı değeri `x-nonce`'tan alıp satır içi ilk boyama betiklerine ve next-themes'e
 * verir. Nonce'un işe yaraması için sayfanın istek anında üretilmesi gerekir: kök düzen
 * `headers()` okuduğundan TÜM sayfalar dinamiktir (statik ön üretim yok).
 *
 * Kimlik kapısı DEĞİLDİR; yalnız başlık ekler.
 */
export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const policy = buildContentSecurityPolicy({
    nonce,
    isDev: process.env.NODE_ENV === "development",
    sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });
  const headerName = cspHeaderName(process.env);

  const requestHeaders = new Headers(request.headers);
  // İstemcinin gönderdiği CSP/nonce başlıkları Next'in nonce ayrıştırıcısına ulaşmasın.
  requestHeaders.delete(CSP_HEADER);
  requestHeaders.delete(CSP_REPORT_ONLY_HEADER);
  requestHeaders.set(NONCE_REQUEST_HEADER, nonce);
  requestHeaders.set(headerName, policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(headerName, policy);
  return response;
}

export const config = {
  matcher: [
    {
      // API rotaları, derleme çıktıları, görsel optimizasyonu ve uzantılı dosyalar (favicon.ico,
      // icon.png, robots.txt, sitemap.xml, manifest.webmanifest, blog og.png) HTML değildir.
      source: "/((?!api/|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)",
      // Bağlantı ön yüklemeleri belge değildir; nonce gerektirmez.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
