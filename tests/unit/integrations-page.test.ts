import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PAGE_META } from "@/lib/seo/page-meta";
import { translations } from "@/lib/i18n/i18n";

const source = readFileSync(path.resolve(__dirname, "../../app/(marketing)/integrations/page.tsx"), "utf8");

/**
 * olmayan entegrasyonların listesi ("Coming Soon": API, Slack, CSV, Zapier)
 * güveni düşürüyordu; sayfa yalnız VAR olanı anlatır. Meta açıklamada da "API access" yok.
 */
describe("/integrations: olmayan entegrasyon vaadi yok", () => {
  it("sayfa Slack, Zapier, API erişimi ya da 'yakında' listesi taşımaz", () => {
    expect(source).not.toMatch(/Coming Soon|Not available yet|do not exist today|Slack|Zapier|API access/i);
  });

  it("meta açıklama ve sosyal açıklama 'API access' ve eksik özellik anmaz", () => {
    const { description, ogDescription } = PAGE_META.integrations;
    expect(description).not.toMatch(/API access|Slack|Zapier|not built yet|coming soon/i);
    expect(ogDescription).not.toMatch(/API access|Slack|Zapier/i);
  });

  it("yedek satırı Veri ve Drive penceresindeki gerçek düğme adlarını kullanır", () => {
    expect(source).toContain(translations.en.account.title);
    expect(source).toContain(`&quot;${translations.en.localData.export}&quot;`);
    expect(source).toContain(`&quot;${translations.en.localData.driveSync}&quot;`);
  });

  it("etiketleri tarayıcıda anlatır ve hesap girişi anlatmaz", () => {
    expect(source).toContain("stored in your browser");
    expect(source).not.toMatch(/Signs in with|Account settings|profile info/);
  });
});
