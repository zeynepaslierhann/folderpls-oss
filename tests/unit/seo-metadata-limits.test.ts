import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_DESCRIPTION,
  MAX_PAGE_TITLE,
  MAX_TITLE,
  PAGE_META,
  SITE_DESCRIPTION,
  SITE_SOCIAL_DESCRIPTION,
  SITE_TITLE,
  TITLE_SUFFIX,
  renderedTitle,
} from "@/lib/seo/page-meta";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { PRIVACY_POLICY } from "@/lib/legal/privacy-policy";
import { TERMS_OF_SERVICE } from "@/lib/legal/terms-of-service";

/**
 * render edilen <title> en çok 60, açıklama en çok 160 karakter.
 * Canlı taban çizgisi: ana sayfa 84/191, /features 63, /pricing 70/179, gizlilik 181/193,
 * üç blog yazısı 69-74/178-187 karakterdi; arama sonucunda kesiliyordu.
 */

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("sayfa başlığı ve açıklama sınırları", () => {
  it("kök şablon uzunluğu ile MAX_PAGE_TITLE tutarlı", () => {
    expect(TITLE_SUFFIX).toBe(" | FolderPls");
    expect(MAX_PAGE_TITLE).toBe(MAX_TITLE - TITLE_SUFFIX.length);
    expect(read("app/layout.tsx")).toContain("template: `%s${TITLE_SUFFIX}`");
  });

  it("ana sayfa: başlık ve açıklama sınır içinde", () => {
    expect(SITE_TITLE.length).toBeLessThanOrEqual(MAX_TITLE);
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
    expect(SITE_SOCIAL_DESCRIPTION.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
  });

  it("her pazarlama sayfası: render edilen başlık ≤ 60, açıklama ≤ 160 (sosyal kart dahil)", () => {
    for (const [key, meta] of Object.entries(PAGE_META)) {
      expect(renderedTitle(meta.title).length, `${key} başlık`).toBeLessThanOrEqual(MAX_TITLE);
      expect(meta.description.length, `${key} açıklama`).toBeLessThanOrEqual(MAX_DESCRIPTION);
      expect(meta.description.length, `${key} açıklama çok kısa`).toBeGreaterThan(40);
      expect(meta.ogTitle.length, `${key} og başlık`).toBeLessThanOrEqual(MAX_TITLE);
      expect(meta.ogDescription.length, `${key} og açıklama`).toBeLessThanOrEqual(MAX_DESCRIPTION);
    }
  });

  it("blog yazıları: <title> ve açıklama kısa sürümlerle sınır içinde", () => {
    for (const post of BLOG_POSTS) {
      // seoTitle MUTLAK başlıktır (kök şablon eklenmez): 12 karakterlik " | FolderPls" eki anahtar kelimeyi
      // başlıktan kovmasın diye (doğrulayıcı bulgusu, 13 Eki 2026).
      const rendered = post.seoTitle ?? renderedTitle(post.title);
      const description = post.seoDescription ?? post.description;
      expect(rendered.length, `${post.slug} başlık`).toBeLessThanOrEqual(MAX_TITLE);
      expect(description.length, `${post.slug} açıklama`).toBeLessThanOrEqual(MAX_DESCRIPTION);
      expect(description.length, `${post.slug} açıklama çok kısa`).toBeGreaterThan(70);
    }
  });

  it("blog yazıları: hedef sorgu 'Google Drive' başlıkta kalır (kısaltma anahtar kelimeyi atmaz)", () => {
    for (const post of BLOG_POSTS) {
      expect(post.seoTitle, `${post.slug} seoTitle`).toBeDefined();
      expect(post.seoTitle, `${post.slug} başlık`).toContain("Google Drive");
    }
  });

  it("blog yazıları: değişiklik tarihi geçerli ve yayın tarihinden önce değil (JSON-LD dateModified)", () => {
    for (const post of BLOG_POSTS) {
      const modified = post.updated ?? post.date;
      expect(modified, post.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(modified >= post.date, `${post.slug} updated >= date`).toBe(true);
    }
  });

  it("yasal sayfalar (gizlilik, şartlar; EN + TR): başlık ≤ 60, açıklama ≤ 160", () => {
    for (const [name, docs] of [
      ["gizlilik", PRIVACY_POLICY],
      ["şartlar", TERMS_OF_SERVICE],
    ] as const) {
      for (const locale of ["en", "tr"] as const) {
        const doc = docs[locale];
        expect(renderedTitle(doc.metaTitle).length, `${name}/${locale} başlık`).toBeLessThanOrEqual(MAX_TITLE);
        expect(doc.metaDescription.length, `${name}/${locale} açıklama`).toBeLessThanOrEqual(MAX_DESCRIPTION);
      }
    }
  });
});

describe("sayfalar başlığı tek kaynaktan alır (satır içi metne dönüş kırmızı olur)", () => {
  const PAGES: Record<string, string> = {
    features: "app/(marketing)/features/page.tsx",
    integrations: "app/(marketing)/integrations/page.tsx",
    pricing: "app/(marketing)/pricing/page.tsx",
    about: "app/(marketing)/about/page.tsx",
    changelog: "app/(marketing)/changelog/page.tsx",
    contact: "app/(marketing)/contact/page.tsx",
    blog: "app/(marketing)/blog/page.tsx",
    driveLabelsChecker: "app/(marketing)/drive-labels-checker/page.tsx",
    demo: "app/(marketing)/demo/page.tsx",
  };

  it("PAGE_META anahtarları ile sayfa listesi aynı", () => {
    expect(Object.keys(PAGE_META).sort()).toEqual(Object.keys(PAGES).sort());
  });

  it.each(Object.entries(PAGES))("%s sayfası PAGE_META kullanır", (key, file) => {
    const source = read(file);
    expect(source).toContain(`title: PAGE_META.${key}.title`);
    expect(source).toContain(`description: PAGE_META.${key}.description`);
    // Sosyal kart metni ya satırda PAGE_META'dan okunur ya da lib/seo/social.ts `socialCards(PAGE_META.<anahtar>, ...)`
    // üzerinden (OG + X kartı aynı çiftten üretilir; satır içi metin yine kırmızı olur).
    const viaHelper = source.includes(`socialCards(PAGE_META.${key},`);
    expect(viaHelper || source.includes(`title: PAGE_META.${key}.ogTitle`), `${key} ogTitle`).toBe(true);
    expect(viaHelper || source.includes(`description: PAGE_META.${key}.ogDescription`), `${key} ogDescription`).toBe(true);
  });

  it("kök düzen başlık/açıklamayı page-meta'dan alır; blog yazısı kısa sürümleri kullanır", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain("default: SITE_TITLE");
    expect(layout).toContain("description: SITE_DESCRIPTION");
    const post = read("app/(marketing)/blog/[slug]/page.tsx");
    expect(post).toContain("{ absolute: post.seoTitle }");
    expect(post).toContain("post.seoTitle ?? post.title");
    expect(post).toContain("post.seoDescription ?? post.description");
    expect(post).toContain("dateModified: post.updated ?? post.date");
  });
});
