import type { Breadcrumb, ErrorEvent, StackFrame } from "@sentry/nextjs";

/**
 * Sentry ortak ayarları (istemci, Node sunucu ve Edge aynı dosyayı kullanır).
 *
 * Hata izleme yalnızca NEXT_PUBLIC_SENTRY_DSN tanımlıysa açılır: çağıran dosyalar
 * dsn yokken Sentry.init'i hiç çalıştırmaz. Ücretsiz plan kotasını ve kullanıcı
 * gizliliğini korumak için performans izleme ve Replay kapalıdır; SDK'nın kendi
 * veri toplaması `dataCollection` ile kapatılır, kalanı olay/iz temizleyicileri süzer.
 *
 * folderpls'e özgü hassas veri (olaylara GİRMEMESİ gerekenler, testler
 * tests/unit/sentry-options.test.ts ve tests/unit/sentry-event-flow.test.ts içinde):
 *  - Drive dosya adları (tıklama izlerindeki `img[alt="Rapor.pdf"]` nitelik değerleri),
 *  - JWT'ler, Google API anahtarı, Google OAuth erişim token'ı, istek gövdeleri ve çerezler,
 *  - OAuth dönüşündeki `?code=` ve adresteki token'lar (`#t=…` gibi fragment'ler, `?token=`): istek adresi,
 *    yığın çerçevesi `filename`/`abs_path`, düz metin ve Next.js `request_path` alanında,
 *  - ziyaretçinin IP'si (`x-forwarded-for` → `user.ip_address`, tarayıcı oturumunda `{{auto}}`).
 *
 * Bu dosya yalnızca tip import eder; Edge'de de güvenle yüklenir ve birim test edilebilir.
 */

// Kimlik bilgisi / imza / IP taşıyan başlıklar: olay yükünden her koşulda çıkarılır.
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-signature",
  "x-api-key",
  "apikey",
  "x-goog-api-key",
  "x-csrf-token",
  "x-xsrf-token",
  // Ziyaretçi IP'si (Sentry de görmemeli)
  "x-forwarded-for",
  "x-real-ip",
  "x-vercel-forwarded-for",
  "x-vercel-proxied-for",
  "cf-connecting-ip",
  "true-client-ip",
  "forwarded",
  "cf-ipcountry",
]);

// x-vercel-ip-country / -city / -latitude / -longitude / -timezone ... ziyaretçi konumu
const SENSITIVE_HEADER_PREFIXES = ["x-vercel-ip-"];

// Başlıklarda kalabilen ama içinde sorgu dizesi taşıyabilen adresler.
const URL_HEADERS = new Set(["referer", "referrer", "origin"]);

// Breadcrumb data alanlarında adres tutan anahtarlar (fetch/xhr: url, navigation: from/to).
const BREADCRUMB_URL_KEYS = ["url", "from", "to"];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Mesaj/istisna metni içindeki mutlak adresler (sorgu, fragment ve user:parola@ temizlenir).
const URL_IN_TEXT_PATTERN = /\bhttps?:\/\/[^\s"'<>`)}]+/gi;
/**
 * YOLUN KENDİSİ gizli olan rotalar: yolunda gizli değer taşıyan yetenek adresleri, ör. `/api/metrics/<slug>`. Yol parçası şablonla değiştirilir — mutlak adreste, yalnız yolda ve düz metinde.
 */
const SECRET_PATH_PATTERNS: readonly [RegExp, string][] = [[/\/api\/metrics\/[^/?#\s"'<>`)}]+/g, "/api/metrics/:slug"]];

function templateSecretPaths(text: string): string {
  let out = text;
  for (const [pattern, template] of SECRET_PATH_PATTERNS) out = out.replace(pattern, template);
  return out;
}

// Düz metinde, MUTLAK OLMAYAN adrese bitişik sorgu/fragment: "GET /api/drive/callback?code=abc 500",
// "callback#access_token=...", "/files/f1?token=x". Yalnız `?anahtar=` / `#anahtar=` ile başlayan
// kuyruk atılır (öncül karakter $1 ile geri yazılır); "Geçerli mi?", "/a+?/", "/pricing#faq"
// gibi metne dokunmaz. Lookbehind YOK (bkz. SECRET_PATTERNS notu).
const QUERY_IN_TEXT_PATTERN = /([^\s?#"'<>])[?#][\w.%[\]-]+=[^\s"'<>)}]*/g;
// Aynı kuyruk tırnak/boşluk/parantez SONRASINDA ya da metin başında da gelebilir:
// "'#t=abc…' is not a valid selector" (querySelector(location.hash) hatası).
const BARE_QUERY_IN_TEXT_PATTERN = /(^|[\s"'`(<])[?#][\w.%[\]-]+=[^\s"'<>)}]*/g;

// lib/logger.ts ile aynı sır desenleri; logger modül yüklenirken localStorage'a
// dokunduğu için Edge/test ortamına içe aktarılmıyor.
// DİKKAT: lookbehind (?<=, ?<!) KULLANMA — iOS Safari < 16.4'te regex literal'i SÖZDİZİMİ HATASI verir
// ve bu dosyayı içeren tüm istemci parçası yüklenmez. Öncül karakter gerekirse $1 ile geri yazılır.
const SECRET_PATTERNS = [
  /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, // JWT
  /-----BEGIN[A-Z ]+KEY-----[\s\S]*?-----END[A-Z ]+KEY-----/g, // özel anahtar
  /AIza[0-9A-Za-z_-]{35}/g, // Google API anahtarı
  /ya29\.[0-9A-Za-z._-]+/g, // Google OAuth erişim token'ı (servis hesabı ya29.c.… dahil)
  /4\/0A[0-9A-Za-z_-]{10,}/g, // Google OAuth yetkilendirme kodu
  /1\/\/[0-9A-Za-z_-]+/g, // Google refresh token
];

// Sentry tıklama izleri elemanı `img[alt="Rapor.pdf"]` biçiminde yazar; alt/title/
// aria-label/name değerlerinde Drive dosya adları var. Nitelik adı kalır, değer atılır.
const ATTRIBUTE_VALUE_PATTERN = /\[([^\]=\s]+)=("[^"]*"|'[^']*'|[^\]]*)\]/g;

/** Metni derinlemesine gezerken en fazla bu kadar iç içe nesne maskelenir. */
const MAX_MASK_DEPTH = 6;

/**
 * Düzenli ifadeler en çok bu kadar karakter üzerinde çalışır. beforeBreadcrumb, uygulamanın
 * her console çağrısında ÇALIŞIR; devasa bir metin (ör. base64 görselli hata iletisi)
 * regex'leri yavaşlatmamalı. Sentry zaten çok daha kısa keser; fazlası burada atılır.
 */
const MAX_MASK_LENGTH = 4000;

function boundText(text: string): string {
  if (text.length <= MAX_MASK_LENGTH) return text;
  // Kesim noktasında yarım kalan bir token/JWT görünmesin: sondaki yarım sözcüğü de at.
  return `${text.slice(0, MAX_MASK_LENGTH).replace(/\S+$/, "")}…[truncated]`;
}

export function maskSensitive(text: string): string {
  let masked = boundText(text).replace(URL_IN_TEXT_PATTERN, (url) => sanitizeUrl(url));
  masked = templateSecretPaths(masked);
  masked = masked.replace(QUERY_IN_TEXT_PATTERN, "$1");
  masked = masked.replace(BARE_QUERY_IN_TEXT_PATTERN, "$1");
  masked = masked.replace(EMAIL_PATTERN, "[email]");
  for (const pattern of SECRET_PATTERNS) {
    masked = masked.replace(pattern, "[redacted]");
  }
  return masked;
}

export function stripAttributeValues(selector: string): string {
  return boundText(selector).replace(ATTRIBUTE_VALUE_PATTERN, "[$1]");
}

/**
 * Sorgu dizesini ve fragment'i atar. Google istekleri `?key=` taşır, OAuth
 * dönüşleri `?code=`, paylaşılan bağlantılar `#t=` / `?token=` taşıyabilir; yol kısmı
 * hata ayıklamak için yeterlidir.
 */
export function stripUrlQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/**
 * Adresi olaya girebilecek hâle getirir: sorgu/fragment ve `user:parola@` kısmı atılır.
 * Mutlak adres de, yalnız yol da (`/files/f1?token=x`) kabul edilir.
 *
 * Token'ların yola değil sorguya ya da fragment'e yazıldığı varsayılır. Yolun KENDİSİ gizli olan tek
 * rota `/api/metrics/<slug>`: SECRET_PATH_PATTERNS ile `/api/metrics/:slug` olur. Yola gizli bir değer
 * koyan yeni rota eklenirse ORAYA şablonla ve testlere ekle.
 */
export function sanitizeUrl(url: string): string {
  const bare = stripUrlQuery(url);
  const origin = /^[a-z][a-z0-9+.-]*:\/\/[^/]*/i.exec(bare)?.[0] ?? "";
  return origin.replace(/\/\/[^/@]*@/, "//") + templateSecretPaths(bare.slice(origin.length));
}

function maskDeep(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return maskSensitive(value);
  if (depth >= MAX_MASK_DEPTH || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => maskDeep(item, depth + 1));
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    record[key] = maskDeep(record[key], depth + 1);
  }
  return record;
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  if (breadcrumb.message) {
    const message = breadcrumb.category?.startsWith("ui.")
      ? stripAttributeValues(breadcrumb.message)
      : breadcrumb.message;
    breadcrumb.message = maskSensitive(message);
  }
  const data = breadcrumb.data;
  if (data) {
    // Konsol izi ham argümanları (nesneler dahil) `arguments` altında da taşır;
    // mesaj zaten dizgeye çevrilip maskelendi, nesneler hiç gönderilmez.
    if (breadcrumb.category === "console") {
      delete data.arguments;
    }
    for (const key of Object.keys(data)) {
      const value = data[key];
      if (typeof value !== "string") continue;
      data[key] = maskSensitive(BREADCRUMB_URL_KEYS.includes(key) ? sanitizeUrl(value) : value);
    }
  }
  return breadcrumb;
}

/**
 * Yığın çerçeveleri: yerel değişken değerleri (etkinleştirilirse) ham kullanıcı verisi taşır;
 * `filename` / `abs_path` ise çoğu zaman paket adresidir AMA SDK, çerçevesiz `onerror` olaylarında
 * (ve satır içi script hatalarında) çerçeve adını SAYFA ADRESİNDEN doldurur: sorgu (OAuth `?code=`),
 * fragment (`#t=`) buradan olaya girebilir. Paket dosya adları (`/_next/static/chunks/x.js`)
 * değişmeden kalır.
 */
function scrubFrames(frames: ReadonlyArray<StackFrame> | undefined): void {
  for (const frame of frames ?? []) {
    delete frame.vars;
    if (typeof frame.filename === "string") frame.filename = maskSensitive(sanitizeUrl(frame.filename));
    if (typeof frame.abs_path === "string") frame.abs_path = maskSensitive(sanitizeUrl(frame.abs_path));
    // Node ayrıştırıcısı `module`u adresin son parçasından türetir; sorgu/fragment de içinde kalır.
    if (typeof frame.module === "string") frame.module = maskSensitive(sanitizeUrl(frame.module));
  }
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const request = event.request;
  if (request) {
    // Gövde, çerezler ve sorgu dizesi hiç gönderilmez.
    delete request.data;
    delete request.cookies;
    delete request.query_string;
    delete request.env; // REMOTE_ADDR gibi sunucu ortamı alanları
    if (request.url) {
      request.url = sanitizeUrl(request.url);
    }
    if (request.headers) {
      for (const name of Object.keys(request.headers)) {
        const lower = name.toLowerCase();
        if (SENSITIVE_HEADERS.has(lower) || SENSITIVE_HEADER_PREFIXES.some((p) => lower.startsWith(p))) {
          delete request.headers[name];
        } else if (typeof request.headers[name] === "string") {
          request.headers[name] = URL_HEADERS.has(lower)
            ? maskSensitive(sanitizeUrl(request.headers[name]))
            : maskSensitive(request.headers[name]);
        }
      }
    }
  }

  // Yalnızca uid kalabilir; e-posta, kullanıcı adı ve IP atılır.
  if (event.user) {
    event.user = event.user.id ? { id: event.user.id } : undefined;
  }

  if (event.message) {
    event.message = maskSensitive(event.message);
  }
  if (event.logentry?.message) {
    event.logentry.message = maskSensitive(event.logentry.message);
  }
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) {
      exception.value = maskSensitive(exception.value);
    }
    scrubFrames(exception.stacktrace?.frames);
  }
  for (const thread of event.threads?.values ?? []) {
    scrubFrames(thread.stacktrace?.frames);
  }

  // İşlem adı sunucuda rota şablonudur (`GET /dashboard/organization/[orgId]`), istemcide
  // ham yol olabilir; ikisi de aynı kuraldan geçer.
  if (event.transaction) {
    event.transaction = event.transaction.replace(
      /(^|\s)(\/\S*)/,
      (_, lead: string, path: string) => lead + sanitizeUrl(path),
    );
  }

  // Next.js onRequestError: contexts.nextjs.request_path ham `request.path` (SORGU DİZESİ
  // DAHİL: /api/drive/callback?code=...) taşır; request.url'den ayrı bir alandır.
  const nextjs = event.contexts?.nextjs as Record<string, unknown> | undefined;
  if (nextjs && typeof nextjs.request_path === "string") {
    nextjs.request_path = sanitizeUrl(nextjs.request_path);
  }
  if (event.contexts) maskDeep(event.contexts);
  if (event.extra) maskDeep(event.extra);
  if (event.tags) maskDeep(event.tags);

  // beforeBreadcrumb zaten her izi süzer; olaya başka yoldan girmiş izler için ikinci kat.
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb);
  }

  return event;
}

/**
 * SDK'nın KENDİSİNİN topladıklarını kapatır (olay temizleyicileri ikinci kattır, tek savunma değil).
 * Açık bırakılan tek şey hata ayıklamaya yeten birkaç istek başlığıdır; çerez, Authorization,
 * x-signature, IP/konum başlıkları, gövde, sorgu dizesi,
 * kullanıcı bilgisi (IP çıkarımı dahil) ve yığın değişkenleri toplanmaz.
 */
const SENTRY_DATA_COLLECTION = {
  userInfo: false, // user.* alanları + oturum/olay IP çıkarımı ({{auto}})
  cookies: false,
  httpHeaders: {
    request: { allow: ["user-agent", "accept-language", "content-type", "host"] },
    response: false,
  },
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
};

export function getSentryOptions() {
  // Literal erişim şart: Next.js NEXT_PUBLIC_* değerlerini derleme anında istemciye yalnızca böyle gömer.
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  // Sunucuda VERCEL_ENV; istemcide Vercel'in açığa çıkardığı NEXT_PUBLIC_VERCEL_ENV; yoksa NODE_ENV.
  const environment =
    process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV;
  // İstemcide VERCEL_GIT_COMMIT_SHA yoktur; o zaman anahtar hiç eklenmez ve
  // withSentryConfig'in derleme anında gömdüğü release (aynı commit) kullanılır.
  const release = process.env.VERCEL_GIT_COMMIT_SHA;

  return {
    dsn,
    environment,
    ...(release ? { release } : {}),
    // @sentry/nextjs 11'de `sendDefaultPii` HİÇBİR YERDE okunmuyor (SDK kodunda ve tiplerinde yok);
    // yerine `dataCollection` geldi ve varsayılanları HER ŞEYİ toplar (kullanıcı IP'si, çerezler, tüm
    // başlıklar, gövdeler, sorgu dizeleri, yığın değişkenleri). Gerçek koruma aşağıdaki
    // `dataCollection`'dır; `sendDefaultPii: false` eski sürümlere/belgelere uyum için bırakıldı.
    sendDefaultPii: false,
    dataCollection: SENTRY_DATA_COLLECTION,
    // Performans izleme kapalı: ücretsiz plan kotası yalnızca hatalara harcanır.
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  };
}
