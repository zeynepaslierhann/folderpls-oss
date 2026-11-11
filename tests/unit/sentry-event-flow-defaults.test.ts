import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as Sentry from "@sentry/nextjs";
import { getSentryOptions } from "@/lib/monitoring/sentry-options";
import { DSN, SECRETS, createCarrier, driveCallbackScenario, eventsOf, wireOf } from "./helpers/sentry-event-flow";

/**
 * @sentry/nextjs 11'de `sendDefaultPii` hiçbir yerde okunmaz; yerine `dataCollection` gelmiştir ve
 * varsayılanları HER ŞEYİ toplar. Bu dosya SDK'yı `dataCollection` OLMADAN (yalnız eski
 * `sendDefaultPii: false` ile) başlatır ve gerçek zarfta ziyaretçi IP'sinin, imza başlığının ve konumun
 * GÖRÜNDÜĞÜNÜ kanıtlar (negatif kontrol); sonra olay temizleyicisinin bunu ikinci kat olarak yine de attığını.
 * Ayrı dosya: Node SDK bir süreçte bir kez başlatılabilir (sentry-event-flow.test.ts kendi ayarlarıyla başlatır).
 */

const options = getSentryOptions();
const state = { scrub: false };
const carrier = createCarrier();

beforeAll(() => {
  Sentry.init({
    ...options,
    dataCollection: undefined, // SDK 11 varsayılanları: kullanıcı IP'si, tüm başlıklar, çerezler...
    dsn: DSN,
    beforeSend: (event) => (state.scrub ? options.beforeSend(event as never) : event),
    beforeBreadcrumb: (crumb) => (state.scrub ? options.beforeBreadcrumb(crumb) : crumb),
    transport: carrier.transport,
  });
});

afterAll(async () => {
  await Sentry.close(1000);
});

describe("sendDefaultPii: false tek başına YETMEZ (SDK 11)", () => {
  it("dataCollection ve temizleyici yokken: x-forwarded-for → user.ip_address, imza ve konum başlıkları zarfta", async () => {
    state.scrub = false;
    const sent = await carrier.run(driveCallbackScenario);

    expect(options.sendDefaultPii).toBe(false); // eski ayar açık biçimde kapalı
    const event = eventsOf(sent)[0];
    const json = wireOf(sent);
    expect(event.user).toEqual({ ip_address: SECRETS.ip });
    expect(json).toContain(SECRETS.ip);
    expect(json).toContain(SECRETS.signature);
    expect(json).toContain(SECRETS.city);
  });

  it("dataCollection yokken ama olay temizleyicisi açıkken: IP/imza/konum yine de atılır (ikinci kat)", async () => {
    state.scrub = true;
    const sent = await carrier.run(driveCallbackScenario);

    expect(eventsOf(sent)[0].user).toBeUndefined();
    const json = wireOf(sent);
    for (const leak of [SECRETS.ip, SECRETS.signature, SECRETS.city]) {
      expect(json, `ikinci kat yetmedi: ${leak}`).not.toContain(leak);
    }
  });
});
