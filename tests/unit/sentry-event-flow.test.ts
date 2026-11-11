import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as Sentry from "@sentry/nextjs";
import { BrowserClient, defaultStackParser } from "@sentry/browser";
import { makeSession } from "@sentry/core";
import { getSentryOptions } from "@/lib/monitoring/sentry-options";
import {
  DSN,
  SECRETS,
  type SentEvent,
  createCarrier,
  driveCallbackScenario,
  eventsOf,
  wireOf,
} from "./helpers/sentry-event-flow";

/**
 * GERÇEK Sentry SDK (sunucu bayrağı + tarayıcı istemcisi) + sahte taşıyıcı: olay SDK'nın kendi
 * hattından geçip gönderim zarfına dönüşür, zarf serileştirilip aranır. Birim testlerin göremediği
 * şeyi kanıtlar: SDK'nın eklediği alanlar (contexts.nextjs.request_path, requestData başlıkları,
 * konsol izleri, oturum zarfındaki ip_address "{{auto}}") beforeSend / beforeBreadcrumb /
 * dataCollection'dan SONRA da temizdir.
 *
 * NEGATİF KONTROL: aynı senaryo temizleyiciler kapatılarak koşulur ve sızıntı zarfta GÖRÜNMELİDİR;
 * böylece "sızmıyor" iddiası boş bir testten gelmez. (SDK varsayılanlarına dönülünce IP sızıntısı:
 * sentry-event-flow-defaults.test.ts — Node SDK bir süreçte bir kez başlatılabildiği için ayrı dosya.)
 * Ağ yok: taşıyıcı zarfı bellekte tutar.
 */

const options = getSentryOptions();
// Temizleyiciler testte açılıp kapatılabilir; AÇIKKEN çağrılan işlevler üretimdekilerin ta kendisidir.
const state = { scrub: true };
const carrier = createCarrier();

beforeAll(() => {
  Sentry.init({
    ...options,
    dsn: DSN,
    beforeSend: (event) => (state.scrub ? options.beforeSend(event as never) : event),
    beforeBreadcrumb: (crumb) => (state.scrub ? options.beforeBreadcrumb(crumb) : crumb),
    transport: carrier.transport,
  });
});

afterAll(async () => {
  await Sentry.close(1000);
});

describe("gerçek SDK hattı: sunucu olay zarfı", () => {
  it("onRequestError + konsol/tıklama izleri: gizli hiçbir değer zarfta yok, hata ayıklama bilgisi var", async () => {
    state.scrub = true;
    const sent = await carrier.run(driveCallbackScenario);

    const events = eventsOf(sent);
    expect(events).toHaveLength(1);
    const event = events[0];

    const json = wireOf(sent);
    for (const [name, secret] of Object.entries(SECRETS)) {
      expect(json, `zarfta sızdı: ${name}`).not.toContain(secret);
    }
    // Sorgu dizesindeki OAuth kodu / bağlantı token'ı ve anahtar parametreleri de yok
    expect(json).not.toMatch(/code=|token=|key=|0AbCdEfGh|lnk_tok/);

    // Anlamlı hata ayıklama bilgisi korunuyor (test boş geçmesin)
    expect(event.contexts?.nextjs?.request_path).toBe("/files/f1");
    expect(event.transaction).toBe("POST /files/[fileId]");
    expect(event.request?.headers?.["user-agent"]).toBe("vitest-agent");
    expect(Object.keys(event.request?.headers ?? {})).toEqual(["user-agent"]);
    // x-forwarded-for'dan IP çıkarımı yok: olayda kullanıcı bloğu hiç yok
    expect(event.user).toBeUndefined();
    const message = event.exception?.values?.[0].value ?? "";
    expect(message).toContain("token exchange failed for [email]: [redacted]");
    expect(message).toContain("GET /api/drive/callback 500");
    expect(message).toContain("https://www.googleapis.com/drive/v3/files");

    // Konsol izlerinin ham argümanları (nesne) gitmedi; maskeli mesaj gitti
    const crumbs = event.breadcrumbs ?? [];
    expect(crumbs.find((b) => b.message?.startsWith("[drive] kullanıcı"))?.message).toBe(
      "[drive] kullanıcı [email] dosya listeledi",
    );
    for (const crumb of crumbs) expect(crumb.data ?? {}).not.toHaveProperty("arguments");
    // Tıklama izinde Drive dosya adı atıldı, nitelik adları kaldı
    expect(crumbs.find((b) => b.message?.startsWith("div.file-item"))?.message).toBe("div.file-item[title] > img[alt]");
  });

  it("çerçevesiz onerror olayı: sayfa adresi (OAuth ?code=, bağlantı #t=) yığın çerçevesinden sızmaz; paket adları kalır", async () => {
    state.scrub = true;
    const pageUrl = `https://app.example.com/files/f1?code=${SECRETS.oauthCode}#t=${SECRETS.linkToken}`;
    const bundle = "app:///_next/static/chunks/0a1b2c3d4e5f6.js";
    const sent = await carrier.run(() => {
      // SDK'nın globalhandlers entegrasyonu çerçevesiz onerror'da çerçeve adını sayfa adresinden doldurur.
      Sentry.captureEvent({
        exception: {
          values: [
            {
              type: "Error",
              value: "inline script failed",
              stacktrace: {
                frames: [
                  { filename: bundle, function: "load", in_app: true },
                  { filename: pageUrl, abs_path: pageUrl, function: "?", in_app: true },
                ],
              },
            },
          ],
        },
        threads: { values: [{ stacktrace: { frames: [{ filename: pageUrl, abs_path: pageUrl }] } }] },
      });
    });

    expect(eventsOf(sent)).toHaveLength(1);
    const json = wireOf(sent);
    expect(json).toContain("https://app.example.com/files/f1"); // test boş geçmesin
    expect(json).toContain(bundle); // paket dosya adı değişmedi
    for (const leak of [SECRETS.oauthCode, SECRETS.linkToken, "code=", "#t=", "0AbCdEfGh"]) {
      expect(json, `zarfta sızdı: ${leak}`).not.toContain(leak);
    }
  });

  describe("negatif kontrol: temizleyiciler kapatılınca sızıntı zarfta GÖRÜNÜR (testler boş değil)", () => {
    it("onRequestError olayı: hata iletisi, Drive dosya adı, ham konsol argümanları ve gizli başlık adları çıkar", async () => {
      state.scrub = false;
      const sent = await carrier.run(driveCallbackScenario);
      state.scrub = true;

      const event = eventsOf(sent)[0] as SentEvent;
      const json = wireOf(sent);

      // @sentry/nextjs 11.12'den beri SDK, istek yolunun sorgusunu (ve içindeki
      // token'ı) kendisi atar; bu sızıntı artık temizleyici kapalıyken de görünmez.
      expect(event.contexts?.nextjs?.request_path).toBe("/files/f1");
      expect(json).not.toContain(SECRETS.linkToken);
      expect(json).toContain(SECRETS.sampleJwt); // hata iletisinde
      expect(json).toContain(SECRETS.driveFileName); // tıklama izinde / konsol argümanında
      expect((event.breadcrumbs ?? []).some((b) => b.data && "arguments" in b.data)).toBe(true); // ham konsol argümanları
      expect(Object.keys(event.request?.headers ?? {})).toEqual(
        expect.arrayContaining(["x-signature", "x-vercel-ip-city"]),
      );
    });

    it("çerçevesiz onerror olayı: sayfa adresindeki ?code= ve #t= yığın çerçevesinde görünür", async () => {
      state.scrub = false;
      const pageUrl = `https://app.example.com/files/f1?code=${SECRETS.oauthCode}#t=${SECRETS.linkToken}`;
      const sent = await carrier.run(() => {
        Sentry.captureEvent({
          exception: {
            values: [{ type: "Error", value: "inline script failed (negatif)", stacktrace: { frames: [{ filename: pageUrl, abs_path: pageUrl }] } }],
          },
        });
      });
      state.scrub = true;

      const json = wireOf(sent);
      expect(json).toContain(SECRETS.oauthCode);
      expect(json).toContain(SECRETS.linkToken);
    });
  });

  it("dataCollection tek başına (temizleyiciler KAPALI): IP, imza ve konum SDK'dan zaten çıkmaz, kullanıcı bloğu yok", async () => {
    state.scrub = false;
    const sent = await carrier.run(driveCallbackScenario);
    state.scrub = true;

    const event = eventsOf(sent)[0] as SentEvent;
    const json = wireOf(sent);
    for (const leak of [SECRETS.ip, SECRETS.signature, SECRETS.city, SECRETS.sessionCookie]) {
      expect(json, `dataCollection yetmedi: ${leak}`).not.toContain(leak);
    }
    expect(event.user).toBeUndefined(); // user.ip_address çıkarımı kapalı
    expect(event.request?.cookies).toBeUndefined();
  });
});

describe("gerçek SDK hattı: tarayıcı oturum zarfı (ip_address {{auto}})", () => {
  async function sessionEnvelopeWith(dataCollection: unknown) {
    const sent: Array<[Record<string, unknown>, Array<[{ type?: string }, unknown]>]> = [];
    const client = new BrowserClient({
      dsn: DSN,
      release: "test-release",
      stackParser: defaultStackParser,
      integrations: [],
      transport: () => ({
        send: async (envelope: (typeof sent)[number]) => {
          sent.push(envelope);
          return {};
        },
        flush: async () => true,
      }),
      dataCollection: dataCollection as never,
    } as ConstructorParameters<typeof BrowserClient>[0]);
    client.init();
    client.captureSession(makeSession({ release: "test-release" }));
    await client.flush(1000);
    const session = sent.flatMap(([, items]) => items).find(([header]) => header.type === "session")?.[1] as
      | { attrs?: Record<string, unknown> }
      | undefined;
    return { sent, attrs: session?.attrs };
  }

  it("bizim ayarlarla (userInfo: false) oturum zarfı ip_address taşımaz", async () => {
    const { sent, attrs } = await sessionEnvelopeWith(options.dataCollection);
    expect(attrs).toMatchObject({ release: "test-release" }); // zarf gerçekten gitti
    expect(attrs?.ip_address).toBeUndefined();
    expect(JSON.stringify(sent)).not.toContain("{{auto}}");
  });

  it("NEGATİF: dataCollection yokken (SDK 11 varsayılanı) aynı zarfta ip_address \"{{auto}}\" gider", async () => {
    const { attrs } = await sessionEnvelopeWith(undefined);
    expect(attrs).toMatchObject({ ip_address: "{{auto}}" });
  });
});
