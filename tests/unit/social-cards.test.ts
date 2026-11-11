import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/og";
import { PAGE_META } from "@/lib/seo/page-meta";
import { socialCards } from "@/lib/seo/social";
import { SITE_URL } from "@/lib/constants/site";

/**
 * Yeni pazarlama sayfalarının X/Twitter ve Open Graph kartları (doğrulayıcı bulgusu, 14 Eki 2026):
 * `twitter` yazılmayınca kart ana sayfa başlığını gösteriyordu; sayfa düzeyindeki `openGraph` kökünkini
 * ezdiği için `og:type` ve `og:site_name` yoktu.
 */

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("socialCards", () => {
  const url = `${SITE_URL}/demo`;
  const cards = socialCards(PAGE_META.demo, url);

  it("Open Graph: tür, site adı, sayfanın kendi başlığı/açıklaması/adresi ve ortak kart görseli", () => {
    expect(cards.openGraph).toMatchObject({
      type: "website",
      siteName: "FolderPls",
      url,
      title: PAGE_META.demo.ogTitle,
      description: PAGE_META.demo.ogDescription,
    });
    expect((cards.openGraph as { images: unknown[] }).images).toEqual([DEFAULT_OG_IMAGE]);
  });

  it("X/Twitter kartı sayfanın kendi başlığını ve açıklamasını taşır; ana sayfanınkini değil", () => {
    expect(cards.twitter).toMatchObject({
      card: "summary_large_image",
      title: PAGE_META.demo.ogTitle,
      description: PAGE_META.demo.ogDescription,
      images: [DEFAULT_OG_IMAGE.url],
    });
    expect(JSON.stringify(cards.twitter)).not.toContain("Tag Google Drive Files Without Moving Them");
  });

  it("iki yeni sayfa (/demo, /drive-labels-checker) kartlarını bu yardımcıdan alır", () => {
    expect(read("app/(marketing)/demo/page.tsx")).toContain("...socialCards(PAGE_META.demo, pageUrl)");
    expect(read("app/(marketing)/drive-labels-checker/page.tsx")).toContain("...socialCards(PAGE_META.driveLabelsChecker, pageUrl)");
  });
});
