import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { OG_TITLE_MAX_CHARS, blogOgImageUrl, ogMeta, ogTitle, ogTitleFontSize } from "@/lib/seo/blog-og";
import { BLOG_POSTS } from "@/lib/blog/posts";

describe("blog sosyal kartı yerleşimi", () => {
  it("kısa başlık olduğu gibi, uzun başlık kırpılıp '…' alır", () => {
    expect(ogTitle("  FolderPls   vs Drive Labels ")).toBe("FolderPls vs Drive Labels");
    const long = ogTitle("x".repeat(300));
    expect(long.length).toBe(OG_TITLE_MAX_CHARS);
    expect(long.endsWith("…")).toBe(true);
  });

  it("punto başlık uzadıkça küçülür", () => {
    expect(ogTitleFontSize("Short title")).toBeGreaterThan(ogTitleFontSize("a".repeat(60)));
    expect(ogTitleFontSize("a".repeat(60))).toBeGreaterThan(ogTitleFontSize("a".repeat(95)));
  });

  it("yazı satırı süre ve tarihi söyler", () => {
    expect(ogMeta(7, "2026-09-27")).toBe("7 min read · Sep 27, 2026");
  });

  it("gerçek yazı başlıkları kartta 4 satırdan fazla tutmaz (≤ 100 karakter, punto ≥ 56)", () => {
    for (const post of BLOG_POSTS) {
      expect(ogTitle(post.title).length, post.slug).toBeLessThanOrEqual(OG_TITLE_MAX_CHARS);
      expect(ogTitleFontSize(post.title), post.slug).toBeGreaterThanOrEqual(56);
    }
  });
});

describe("yazı sayfası yazıya özgü kartı kullanır", () => {
  const dir = path.resolve(__dirname, "../../app/(marketing)/blog/[slug]");
  const page = readFileSync(path.join(dir, "page.tsx"), "utf8");
  const route = readFileSync(path.join(dir, "og.png/route.tsx"), "utf8");

  it("adres sabit ve yazıya özgü: /blog/<slug>/og.png", () => {
    expect(blogOgImageUrl("https://app.example.com/blog/a")).toBe("https://app.example.com/blog/a/og.png");
  });

  it("kart rotası her yazı için üretilir ve başlığı çizer", () => {
    expect(route).toMatch(/generateStaticParams\(\)/);
    expect(route).toMatch(/BLOG_POSTS\.map/);
    expect(route).toMatch(/ogTitle\(post\.title\)/);
    expect(route).toMatch(/force-static/);
  });

  it("sayfa genel kartı geri getirmez; openGraph, twitter ve JSON-LD aynı kartı gösterir", () => {
    expect(page).not.toMatch(/DEFAULT_OG_IMAGE/);
    expect(page).toMatch(/images:\s*\[image\]/);
    expect(page).toMatch(/images:\s*\[image\.url\]/);
    expect(page).toMatch(/image:\s*blogOgImageUrl\(url\)/);
  });
});
