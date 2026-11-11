import { describe, expect, it } from "vitest";
import { PRIVACY_POLICY } from "@/lib/legal/privacy-policy";

/**
 * ABD'li ziyaretçiye gönüllü CCPA şeffaflık bölümü. Bölüm yalnız kodla
 * doğrulanmış olanı söyler (satmıyoruz, reklam/izleyici yok, 30 gün yanıt, uygulama içi dışa aktarma/silme)
 * ve diğer bölümlere numarayla başvurur: bu yüzden numaralandırma testle kilitli.
 */
const LOCALES = [
  { locale: "en" as const, id: "us-residents", sell: /do not sell personal information/, advertising: /cross-context behavioral advertising/, days: /30 days/, ccpa: /California Consumer Privacy Act \(CCPA\)/ },
  { locale: "tr" as const, id: "abd-sakinleri", sell: /Kişisel bilgileri satmayız/, advertising: /çapraz bağlamlı davranışsal reklam/, days: /30 gün/, ccpa: /Kaliforniya Tüketici Gizliliği Yasası \(CCPA\)/ },
];

function text(locale: "en" | "tr", id: string): string {
  const section = PRIVACY_POLICY[locale].sections.find((s) => s.id === id);
  if (!section) throw new Error(`bölüm yok: ${locale}/${id}`);
  return section.blocks.flatMap((b) => (b.type === "ul" ? [...b.items] : [b.text])).join("\n");
}

describe("gizlilik politikası: ABD sakinleri bölümü", () => {
  for (const { locale, id, sell, advertising, days, ccpa } of LOCALES) {
    it(`${locale}: bölüm var; CCPA'yı anar, satmadığını ve reklam için paylaşmadığını söyler`, () => {
      const body = text(locale, id);
      expect(body).toMatch(ccpa);
      expect(body).toMatch(sell);
      expect(body).toMatch(advertising);
    });

    it(`${locale}: haklar için uygulama içi yol ve e-posta, ${days.source} yanıt süresi (bölüm 8 ile aynı)`, () => {
      const body = text(locale, id);
      expect(body).toContain("[NEXT_PUBLIC_CONTACT_EMAIL]");
      expect(body).toMatch(days);
      // Bölüm 8 de aynı süreyi söylüyor: iki yerde farklı süre yazılmasın.
      expect(text(locale, locale === "en" ? "rights" : "haklariniz")).toMatch(days);
    });

    it(`${locale}: başvurduğu bölüm numaraları (2, 3, 5, 6, 7) gerçekten o başlıkları taşır`, () => {
      const titles = PRIVACY_POLICY[locale].sections.map((s) => s.title);
      for (const n of [2, 3, 5, 6, 7]) expect(titles.some((t) => t.startsWith(`${n}. `)), `bölüm ${n}`).toBe(true);
    });

    it(`${locale}: başlık numaraları 1..N sırayla, boşluk ve yineleme yok`, () => {
      const nums = PRIVACY_POLICY[locale].sections.map((s) => Number(s.title.split(".")[0]));
      expect(nums).toEqual(nums.map((_, i) => i + 1));
    });
  }

  it("iki dilde aynı bölüm sayısı", () => {
    expect(PRIVACY_POLICY.tr.sections).toHaveLength(PRIVACY_POLICY.en.sections.length);
  });
});
