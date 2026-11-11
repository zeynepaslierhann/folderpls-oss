/**
 * Content-Security-Policy, istek başına nonce ile (proxy.ts her HTML isteğinde çağırır).
 *
 * Neden sıkı: Google erişim token'ı `sessionStorage`'da durur. Sayfaya sızan tek bir betik onu
 * okuyabilir; React kaçışı tek savunma kalmasın diye `script-src` yalnız nonce'lu betiklere ve
 * onların `'strict-dynamic'` ile yüklediklerine (Next parçaları, GIS, Picker, tembel Sentry) izin
 * verir. Üretimde `'unsafe-inline'` ve `'unsafe-eval'` YOKTUR; `'unsafe-eval'` yalnız `next dev`
 * içindir (React geliştirme yığınları).
 *
 * `style-src 'unsafe-inline'` bilinçli: React `style={…}` öznitelikleri, Radix ve Google Picker'ın
 * ana sayfaya koyduğu `<style>` öğeleri nonce taşımaz. Stil enjeksiyonu betik çalıştıramaz; token
 * hırsızlığı yolu `script-src` ile kapalıdır. `style-src`'ye nonce EKLEME: nonce varken tarayıcı
 * `'unsafe-inline'`ı yok sayar ve bu stiller kırılır.
 *
 * Kaynak listesi (tests/unit/csp.test.ts ile kilitli):
 *  - GIS (`accounts.google.com/gsi/client`) token akışı: betik, açılır pencere, `oauth2.revoke`
 *    → `oauth2.googleapis.com`.
 *  - Google Picker: `apis.google.com/js/api.js` + `gapi.load("picker")`, iframe `docs.google.com`.
 *  - Drive REST ve yükleme: `www.googleapis.com`.
 *  - Küçük resim / simge / profil fotoğrafı: `*.googleusercontent.com`, `lh3.google.com`,
 *    `drive.google.com`; `webContentLink` önizlemesi `drive.usercontent.google.com`'a yönlenir.
 *  - Drive video önizlemesi: iframe `drive.google.com/file/d/…/preview`.
 *  - Sentry: yalnız DSN tanımlıysa ve yalnız DSN'in kendi alım kökeni.
 *
 * Host listeleri `'strict-dynamic'` destekleyen tarayıcılarda `script-src` için yok sayılır;
 * yalnız CSP2 tarayıcıları için geri dönüş olarak durur.
 */

export const CSP_HEADER = "Content-Security-Policy";
export const CSP_REPORT_ONLY_HEADER = "Content-Security-Policy-Report-Only";
export const CSP_REPORT_PATH = "/api/csp-report";
/** `Reporting-Endpoints` başlığındaki ad (next.config.ts). */
export const CSP_REPORT_GROUP = "csp-endpoint";
/** proxy.ts nonce'u bu istek başlığıyla sunucu bileşenlerine (app/layout.tsx) taşır. */
export const NONCE_REQUEST_HEADER = "x-nonce";

export type CspHeaderName = typeof CSP_HEADER | typeof CSP_REPORT_ONLY_HEADER;

export interface CspOptions {
  nonce: string;
  isDev: boolean;
  /** NEXT_PUBLIC_SENTRY_DSN; yoksa Sentry'ye hiçbir ağ izni verilmez. */
  sentryDsn?: string;
}

/** 128 bit rastgele, base64. Next'in nonce ayrıştırıcısı (`'nonce-[A-Za-z0-9+/_-]+={0,2}'`) ile uyumlu. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** DSN'den yalnız alım kökeni (`https://o1.ingest.de.sentry.io`); geçersiz ya da https değilse null. */
export function sentryIngestOrigin(dsn: string | undefined): string | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    return url.protocol === "https:" && url.host ? `https://${url.host}` : null;
  } catch {
    return null;
  }
}

export function buildCspDirectives({ nonce, isDev, sentryDsn }: CspOptions): Record<string, string[]> {
  const sentryOrigin = sentryIngestOrigin(sentryDsn);
  return {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      "https://accounts.google.com/gsi/client",
      "https://apis.google.com",
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    // next/font/google fontları derleme sırasında indirip /_next/static altından sunar.
    "font-src": ["'self'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://*.googleusercontent.com",
      "https://lh3.google.com",
      "https://drive.google.com",
      "https://drive.usercontent.google.com",
    ],
    "media-src": [
      "'self'",
      "blob:",
      "https://drive.google.com",
      "https://drive.usercontent.google.com",
      "https://*.googleusercontent.com",
    ],
    "connect-src": [
      "'self'",
      "https://www.googleapis.com",
      "https://oauth2.googleapis.com",
      "https://accounts.google.com",
      ...(sentryOrigin ? [sentryOrigin] : []),
      ...(isDev ? ["ws:"] : []),
    ],
    "frame-src": ["https://docs.google.com", "https://accounts.google.com", "https://drive.google.com"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "report-uri": [CSP_REPORT_PATH],
    "report-to": [CSP_REPORT_GROUP],
  };
}

export function serializeCsp(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${[...new Set(sources)].join(" ")}`)
    .join("; ");
}

export function buildContentSecurityPolicy(options: CspOptions): string {
  return serializeCsp(buildCspDirectives(options));
}

/**
 * Varsayılan ZORUNLU. `CSP_REPORT_ONLY=1` açık kaçış kapısıdır: ihlaller engellenmez, yalnız
 * raporlanır (yeni bir üçüncü taraf eklenirken ya da bir akış kırıldığında geçici olarak).
 */
export function cspHeaderName(env: Record<string, string | undefined>): CspHeaderName {
  return env.CSP_REPORT_ONLY === "1" ? CSP_REPORT_ONLY_HEADER : CSP_HEADER;
}
