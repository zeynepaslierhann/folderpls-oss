import * as Sentry from "@sentry/nextjs";

/**
 * Sentry zarf testlerinin ortak parçaları (sahte taşıyıcı + gizli değerli örnek senaryo).
 * Vitest yalnızca *.test.ts dosyalarını koşar; bu dosya tek başına test içermez.
 */

export type Envelope = [Record<string, unknown>, Array<[{ type?: string }, unknown]>];

export type SentEvent = {
  request?: { headers?: Record<string, string>; url?: string; cookies?: unknown; data?: unknown };
  contexts?: { nextjs?: { request_path?: string } };
  exception?: {
    values?: Array<{ value?: string; stacktrace?: { frames?: Array<{ filename?: string; abs_path?: string }> } }>;
  };
  breadcrumbs?: Array<{ message?: string; data?: Record<string, unknown> }>;
  transaction?: string;
  user?: unknown;
};

export const DSN = "https://publickey@o0.ingest.de.sentry.io/1";

// Sır benzeri örnekler çalışma anında birleştirilir (kaynakta sır deseni olarak görünmesin).
export const SECRETS = {
  linkToken: ["lnk", "tok", "9fA7xQ2LmN8vR4sT"].join("_"),
  oauthCode: ["4", "0AbCdEfGh-oauth-code"].join("/"),
  sampleJwt: ["eyJhbGciOiJSUzI1NiJ9", "eyJzdWIiOiJ1c2VyMSJ9", "c2lnbmF0dXJlLXZhbHVl"].join("."),
  googleKey: ["AIza", "B".repeat(35)].join(""),
  signature: "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
  sessionCookie: "session=s3cr3t-cookie-value",
  ip: "203.0.113.77",
  city: "Eskisehir",
  email: "ahmet.yilmaz@acme-example.com",
  driveFileName: "Maas bordrosu Ahmet Yilmaz.pdf",
};

/** Node SDK bir süreçte bir kez başlatılır; senaryolar arasında zarf listesini sıfırlayan taşıyıcı. */
export function createCarrier() {
  let sent: Envelope[] = [];
  return {
    transport: () => ({
      send: async (envelope: Envelope) => {
        sent.push(envelope);
        return {};
      },
      flush: async () => true,
    }),
    async run(scenario: () => void | Promise<void>): Promise<Envelope[]> {
      sent = [];
      await scenario();
      await Sentry.flush(2000);
      return sent;
    },
  };
}

export const eventsOf = (sent: Envelope[]): SentEvent[] =>
  sent
    .flatMap(([, items]) => items)
    .filter(([header]) => header.type === "event")
    .map(([, event]) => event as SentEvent);

/**
 * Zarfı "hiçbir yerde geçmiyor" aramaları için serileştirir. Sunucu SDK'sı yığın çerçevelerine
 * ÇALIŞAN KAYNAK DOSYANIN satırlarını (pre/context_line/post_context) ekler; bu, bu test dosyalarının
 * kendi kaynak metnidir (örnek gizli değerler orada yazılı), istekten gelen veri değildir.
 */
export const wireOf = (value: unknown): string =>
  JSON.stringify(value, (key, v) => (["pre_context", "context_line", "post_context"].includes(key) ? undefined : v));

let run = 0;

/** Drive callback hatası: gizli değerlerle dolu bir onRequestError olayı + izler. */
export function driveCallbackScenario(): void {
  run += 1; // Dedupe entegrasyonu art arda aynı olayı atar; her koşuda ileti farklı olsun
  console.log("[drive] dosya", { name: SECRETS.driveFileName, idToken: SECRETS.sampleJwt });
  console.log(`[drive] kullanıcı ${SECRETS.email} dosya listeledi`);
  Sentry.addBreadcrumb({
    category: "ui.click",
    message: `div.file-item[title="${SECRETS.driveFileName}"] > img[alt="${SECRETS.driveFileName}"]`,
  });

  Sentry.captureRequestError(
    new Error(
      `token exchange failed for ${SECRETS.email}: ${SECRETS.sampleJwt} ` +
        `GET /api/drive/callback?code=${SECRETS.oauthCode} 500 ` +
        `https://www.googleapis.com/drive/v3/files?key=${SECRETS.googleKey} (run ${run})`,
    ),
    {
      path: `/files/f1?token=${SECRETS.linkToken}&code=${SECRETS.oauthCode}`,
      method: "POST",
      headers: {
        cookie: SECRETS.sessionCookie,
        authorization: `Bearer ${SECRETS.sampleJwt}`,
        "x-signature": SECRETS.signature,
        "x-forwarded-for": SECRETS.ip,
        "x-vercel-ip-city": SECRETS.city,
        "user-agent": "vitest-agent",
      },
    },
    { routerKind: "App Router", routePath: "/files/[fileId]", routeType: "render" },
  );
}
