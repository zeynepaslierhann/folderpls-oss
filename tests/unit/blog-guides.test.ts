import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { GUIDE_POSTS } from "@/lib/blog/guides";

const page = readFileSync(path.resolve(__dirname, "../../app/(marketing)/blog/[slug]/page.tsx"), "utf8");

describe("arama niyetli rehberler (16 Eki 2026)", () => {
  it("5 rehber var ve hepsi blog listesinde (sitemap BLOG_POSTS'tan türer)", () => {
    expect(GUIDE_POSTS).toHaveLength(5);
    for (const g of GUIDE_POSTS) expect(BLOG_POSTS).toContain(g);
  });

  it("her rehberin görünür SSS'si var; yanıtlar düz metin (JSON-LD ile görünen metin birebir aynı)", () => {
    for (const g of GUIDE_POSTS) {
      expect(g.faq?.length ?? 0, g.slug).toBeGreaterThanOrEqual(3);
      for (const f of g.faq ?? []) {
        expect(f.q.endsWith("?"), f.q).toBe(true);
        expect(f.a, f.q).not.toMatch(/\[[^\]]*\]\(|\[\^|`/);
      }
    }
  });

  it("her rehber bir başka rehbere iç bağlantı verir, kaynakları tarihli; en az biri uygulamaya bağlanır", () => {
    for (const g of GUIDE_POSTS) {
      const text = JSON.stringify(g.blocks);
      expect(text, g.slug).toMatch(/\]\(\/blog\/[a-z0-9-]+\)/);
      expect(g.sources.length, g.slug).toBeGreaterThanOrEqual(2);
      for (const s of g.sources) expect(s.accessed).toBe("2026-10-16");
    }
    expect(GUIDE_POSTS.some((g) => JSON.stringify(g.blocks).includes("](/dashboard)"))).toBe(true);
  });

  it("sayfa FAQPage JSON-LD üretir", () => {
    expect(page).toMatch(/"@type": "FAQPage"/);
    expect(page).toMatch(/acceptedAnswer/);
  });
});
