import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PRIVACY_POLICY } from "@/lib/legal/privacy-policy";
import { TERMS_OF_SERVICE } from "@/lib/legal/terms-of-service";
import { hostingInfo } from "@/lib/legal/hosting";

/**
 * Gizlilik politikası, kodun GERÇEKTEN kullandığı hizmet sağlayıcıları söylemeli (KVKK md. 10 / GDPR md. 13).
 * Yerel mod (9 Kas 2026): hesap ve veritabanı yok. Sentry paketi yalnız NEXT_PUBLIC_SENTRY_DSN tanımlı kopyalarda
 * çalışır; politika varsayılanın kapalı olduğunu söyler.
 *
 * Bağımlılık -> politikada geçmesi gereken ad. Yeni bir sağlayıcı paketi eklenince bu liste güncellenmeden
 * "listede olmayan bağımlılık" testi değil, politika eksikliği kırmızı görünür.
 */
const ROOT = path.resolve(__dirname, "../..");
const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
  dependencies: Record<string, string>;
};

const PROVIDER_BY_DEPENDENCY: Record<string, string> = {
  "@sentry/nextjs": "Sentry",
};

function sectionText(locale: "en" | "tr", id: string): string {
  const section = PRIVACY_POLICY[locale].sections.find((s) => s.id === id);
  if (!section) throw new Error(`bölüm yok: ${locale}/${id}`);
  return section.blocks
    .flatMap((b) => (b.type === "ul" ? [...b.items] : [b.text]))
    .join("\n");
}

const PROCESSORS = { en: "processors", tr: "aktarim" } as const;
const RETENTION = { en: "retention", tr: "saklama" } as const;
const TECHNICAL = { en: "data-we-process", tr: "islenen-veriler" } as const;

describe("gizlilik politikası sağlayıcı listesi koda uyar", () => {
  for (const locale of ["en", "tr"] as const) {
    it(`${locale}: bağımlılığı olan her sağlayıcı sağlayıcılar bölümünde adıyla geçer`, () => {
      const processors = sectionText(locale, PROCESSORS[locale]);
      for (const [dep, name] of Object.entries(PROVIDER_BY_DEPENDENCY)) {
        expect(pkg.dependencies[dep], `${dep} package.json'da yok; eşleme bayat`).toBeDefined();
        expect(processors, `${locale}: ${name} (${dep}) sağlayıcılar bölümünde yok`).toContain(name);
      }
    });

    it(`${locale}: Sentry girişi gerçek yapılandırmayı anlatır (AB bölgesi, IP adresi saklama)`, () => {
      const processors = sectionText(locale, PROCESSORS[locale]);
      const line = processors.split("\n").find((l) => l.includes("Sentry"));
      expect(line, "Sentry satırı").toBeDefined();
      expect(line).toMatch(/Frankfurt/);
      expect(line).toMatch(locale === "en" ? /IP address/ : /IP adres/);
    });

    it(`${locale}: Sentry varsayılan kapalı, yalnız onu açan kopyalarda çalışır`, () => {
      const line = sectionText(locale, PROCESSORS[locale]).split("\n").find((l) => l.includes("Sentry"));
      expect(line).toMatch(locale === "en" ? /off by default/ : /varsayılan olarak kapalıdır/);
    });

    it(`${locale}: etiketler tarayıcıda; yalnız drive.file; yenileme anahtarı yok; ücret ve hesap anlatılmaz`, () => {
      const data = sectionText(locale, TECHNICAL[locale]);
      expect(data).toMatch(/IndexedDB/);
      expect(data).toMatch(/drive\.file/);
      expect(data).toMatch(/folderpls-tags\.json/);
      expect(data).toMatch(locale === "en" ? /does not obtain a refresh token/ : /yenileme anahtarı \(refresh token\) almaz/);
    });

    it(`${locale}: barındırma sağlayıcısı sabit değil; kopyayı yayınlayanın ortam değişkeninden gelir`, () => {
      expect(JSON.stringify(PRIVACY_POLICY[locale])).not.toMatch(/Vercel/);
      const host = hostingInfo(locale);
      expect(sectionText(locale, PROCESSORS[locale])).toContain(host.name);
      expect(sectionText(locale, RETENTION[locale])).toContain(host.name);
    });

    it(`${locale}: Google'ın zorunlu Sınırlı Kullanım cümlesi birebir duruyor`, () => {
      expect(sectionText(locale, locale === "en" ? "google-limited-use" : "google-sinirli-kullanim")).toContain(
        "FolderPls's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy",
      );
    });

    it(`${locale}: kaldırılan sağlayıcılar ve özellikler iki yasal metinde de yok`, () => {
      for (const doc of [PRIVACY_POLICY[locale], TERMS_OF_SERVICE[locale]]) {
        const text = JSON.stringify(doc);
        expect(text).not.toMatch(/Firebase|Firestore|Lemon Squeezy|Anthropic|auto-?tag|otomatik etiket|refund|\biade\b|subscription fee/i);
      }
    });

    it(`${locale}: saklama bölümü Sentry hata raporlarını da söyler; teknik kayıtlar bölümü Sentry'ye gönderir`, () => {
      expect(sectionText(locale, RETENTION[locale])).toContain("Sentry");
      expect(sectionText(locale, TECHNICAL[locale])).toContain("Sentry");
    });
  }
});

describe("barındırma sağlayıcısı ayarı", () => {
  it("tanımlı değilse açık yer tutucu, iki dilde", () => {
    expect(hostingInfo("en", {})).toEqual({ name: "[hosting provider: set HOSTING_PROVIDER]", configured: false });
    expect(hostingInfo("tr", { HOSTING_PROVIDER: "  " }).name).toMatch(/^\[barındırma sağlayıcısı/);
  });

  it("tanımlıysa ad ve bölge metne girer", async () => {
    expect(hostingInfo("en", { HOSTING_PROVIDER: " Örnek Host Ltd. ", HOSTING_REGION: "Frankfurt" })).toEqual({
      name: "Örnek Host Ltd.",
      region: "Frankfurt",
      configured: true,
    });
    vi.stubEnv("HOSTING_PROVIDER", "Örnek Host Ltd.");
    vi.stubEnv("HOSTING_REGION", "Frankfurt");
    vi.resetModules();
    const { PRIVACY_POLICY: configured } = await import("@/lib/legal/privacy-policy");
    vi.unstubAllEnvs();
    for (const locale of ["en", "tr"] as const) {
      const processors = configured[locale].sections
        .find((s) => s.id === PROCESSORS[locale])!
        .blocks.flatMap((b) => (b.type === "ul" ? [...b.items] : [b.text]))
        .join("\n");
      expect(processors).toContain("Örnek Host Ltd.");
      expect(processors).toContain("Frankfurt");
      expect(JSON.stringify(configured[locale])).not.toContain("HOSTING_PROVIDER");
    }
  });
});
