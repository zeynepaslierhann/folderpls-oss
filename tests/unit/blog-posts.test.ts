import { describe, it, expect } from "vitest";
import { BLOG_POSTS, getPostBySlug, parseInline } from "@/lib/blog/posts";
import { COMPARISON_ROWS, COMPARISON_SOURCES } from "@/lib/marketing/drive-labels-comparison";
import { formatIsoDate } from "@/lib/utils/date";

const allText = (post: (typeof BLOG_POSTS)[number]) =>
  post.blocks
    .flatMap((b) => {
      if (b.type === "ul" || b.type === "ol") return b.items;
      if (b.type === "table") return [b.caption, ...b.head, ...b.rows.flat()];
      return [b.text];
    })
    .join("\n");

describe("blog posts", () => {
  it("has the launch posts, the Drive Labels comparison and the search-intent guides, with unique, URL-safe slugs", () => {
    expect(BLOG_POSTS).toHaveLength(8);
    const slugs = BLOG_POSTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(getPostBySlug("folderpls-vs-google-drive-labels")?.title).toContain("Google Drive Labels");
  });

  it("keeps SEO metadata inside search-result limits", () => {
    for (const post of BLOG_POSTS) {
      expect(post.title.length).toBeLessThanOrEqual(70);
      expect(post.description.length).toBeGreaterThan(70);
      expect(post.description.length).toBeLessThanOrEqual(200);
      expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("every footnote points at a listed source, and every source is cited", () => {
    for (const post of BLOG_POSTS) {
      const cited = [...allText(post).matchAll(/\[\^([a-z0-9-]+)\]/g)].map((m) => m[1]);
      const ids = post.sources.map((s) => s.id);
      for (const id of cited) expect(ids, `${post.slug} cites ${id}`).toContain(id);
      for (const id of ids) expect(cited, `${post.slug} never cites ${id}`).toContain(id);
      for (const s of post.sources) expect(s.url).toMatch(/^https:\/\//);
    }
  });

  it("internal links only point at pages that exist", () => {
    const known = new Set(["/", "/pricing", "/demo", "/dashboard", "/drive-labels-checker", ...BLOG_POSTS.map((p) => `/blog/${p.slug}`)]);
    for (const post of BLOG_POSTS) {
      for (const token of parseInline(allText(post))) {
        if (token.kind === "link" && token.href.startsWith("/")) expect(known.has(token.href), token.href).toBe(true);
      }
    }
  });

  it("does not repeat the unverified '5 labels per file' claim (Google says 150)", () => {
    const corpus = BLOG_POSTS.map(allText).join("\n") + JSON.stringify(COMPARISON_ROWS);
    expect(corpus).not.toMatch(/\b5 labels\b|\bfive labels\b|5 etiket/i);
    expect(corpus).toMatch(/150/);
  });
});

describe("Drive Labels comparison data", () => {
  it("cites only declared sources and keeps a row that favours Drive Labels (fairness)", () => {
    const ids = new Set(COMPARISON_SOURCES.map((s) => s.id));
    for (const row of COMPARISON_ROWS) for (const id of row.sourceIds) expect(ids.has(id)).toBe(true);
    expect(COMPARISON_ROWS.some((r) => r.edge === "drive-labels")).toBe(true);
    expect(COMPARISON_ROWS.filter((r) => r.compact).length).toBeGreaterThanOrEqual(3);
  });
});

describe("parseInline", () => {
  it("splits text, links, footnotes and code", () => {
    expect(parseInline("See [pricing](/pricing) now.[^apply] Use `a_b`.")).toEqual([
      { kind: "text", value: "See " },
      { kind: "link", text: "pricing", href: "/pricing" },
      { kind: "text", value: " now." },
      { kind: "footnote", sourceId: "apply" },
      { kind: "text", value: " Use " },
      { kind: "code", value: "a_b" },
      { kind: "text", value: "." },
    ]);
  });
});

describe("formatIsoDate", () => {
  it("formats deterministically in both locales", () => {
    expect(formatIsoDate("2026-09-27", "en")).toBe("27 September 2026");
    expect(formatIsoDate("2026-01-05", "tr")).toBe("5 Ocak 2026");
  });
});
