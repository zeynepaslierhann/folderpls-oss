import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/lib/blog/posts";

/**
 * Blog ABD'li okur için yazılır (og:locale=en_US, hedef kitle ABD'li bağımsız yaratıcılar).
 * Rapor 10. bulgu: "organise", "colours" gibi İngiliz yazımı. Alıntılanmış kaynak metin olursa o
 * ifade bu listeden çıkarılır, gerekçesiyle: şu an blogda alıntılanmış İngiliz yazımı yok.
 */
const BRITISH =
  /\b(?:organis\w*|colour\w*|labelled|labelling|behaviour\w*|favour\w*|centre\w*|catalogue\w*|licen[cs]e(?=d\b)|analys(?:e|ed|ing)|prioritis\w*|recognis\w*|customis\w*|summaris\w*|categoris\w*|optimis\w*|cancelled|grey)\b/i;

describe("blog: ABD yazımı", () => {
  it("hiçbir yazının görünen ya da meta alanında İngiliz yazımı yok", () => {
    const hits: string[] = [];
    for (const post of BLOG_POSTS) {
      const text = JSON.stringify(post);
      const m = text.match(new RegExp(BRITISH.source, "gi"));
      if (m) hits.push(`${post.slug}: ${[...new Set(m)].join(", ")}`);
    }
    expect(hits).toEqual([]);
  });

  it("tarayıcının kendisi İngiliz yazımını yakalar", () => {
    for (const bad of ["organise files", "Folder colours", "files labelled", "File organisation"]) {
      expect(BRITISH.test(bad), bad).toBe(true);
    }
    expect(BRITISH.test("organize files in a color-coded way, canceled order")).toBe(false);
  });
});
