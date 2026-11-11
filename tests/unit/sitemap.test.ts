import { describe, it, expect, vi, afterEach } from "vitest";
import sitemap from "@/app/sitemap";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { LEGAL_LAST_UPDATED_ISO } from "@/lib/legal/types";
import { SITE_URL } from "@/lib/constants/site";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("sitemap lastmod — build zamanına bağlı değil", () => {
  it("farklı zamanlarda ve farklı VERCEL_BUILD_TIME ile aynı çıktıyı verir", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    vi.stubEnv("VERCEL_BUILD_TIME", "2026-01-01T00:00:00Z");
    const first = JSON.stringify(sitemap());
    vi.setSystemTime(new Date("2026-12-31T00:00:00Z"));
    vi.stubEnv("VERCEL_BUILD_TIME", "2026-12-31T00:00:00Z");
    const second = JSON.stringify(sitemap());
    expect(second).toBe(first);
  });

  it("ana sayfa ve tarihi bilinmeyen pazarlama sayfaları lastModified yazmaz", () => {
    const entries = sitemap();
    const byUrl = new Map(entries.map((e) => [e.url, e]));
    for (const path of ["", "/features", "/pricing", "/integrations", "/about", "/contact", "/changelog"]) {
      const entry = byUrl.get(`${SITE_URL}${path}`);
      expect(entry, path || "/").toBeDefined();
      expect(entry!.lastModified).toBeUndefined();
    }
  });

  it("blog dizini en yeni yazının tarihini, yazılar kendi tarihini taşır; güncellenmiş yazıda `updated` (JSON-LD dateModified ile aynı)", () => {
    const byUrl = new Map(sitemap().map((e) => [e.url, e]));
    const modified = (p: (typeof BLOG_POSTS)[number]) => new Date(p.updated ?? p.date);
    const newest = BLOG_POSTS.map(modified).sort((a, b) => b.getTime() - a.getTime())[0];
    expect(byUrl.get(`${SITE_URL}/blog`)!.lastModified).toEqual(newest);
    for (const post of BLOG_POSTS) {
      expect(byUrl.get(`${SITE_URL}/blog/${post.slug}`)!.lastModified).toEqual(modified(post));
    }
    // doğrulayıcı bulgusu: updated'ı olan yazı yayın gününde kalmaz
    const updated = BLOG_POSTS.filter((p) => p.updated && p.updated !== p.date);
    expect(updated.length).toBeGreaterThan(0);
    for (const post of updated) {
      expect(byUrl.get(`${SITE_URL}/blog/${post.slug}`)!.lastModified, post.slug).toEqual(new Date(post.updated!));
    }
  });

  it("yasal sayfalar yasal güncelleme tarihini taşır; tüm URL'ler mutlak ve tekil", () => {
    const entries = sitemap();
    const legal = entries.filter((e) => /privacy|terms|gizlilik|kullanim|cookie|cerez/i.test(e.url));
    expect(legal.length).toBeGreaterThan(0);
    for (const e of legal) expect(e.lastModified).toEqual(new Date(LEGAL_LAST_UPDATED_ISO));
    const urls = entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const u of urls) expect(u).toMatch(/^https?:\/\//);
  });
});
