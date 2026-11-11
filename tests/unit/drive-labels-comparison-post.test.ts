import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BLOG_POSTS, getPostBySlug, parseInline } from "@/lib/blog/posts";
import { CHECKER_CHECKED_ON, CHECKER_FAQ, EDITION_CHOICES, evaluateChecker, type CheckerAnswers } from "@/lib/marketing/drive-labels-checker";
import { COMPARISON_CHECKED_ON, COMPARISON_ROWS } from "@/lib/marketing/drive-labels-comparison";
import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/lib/constants/site";

/**
 * "FolderPls vs Google Drive Labels" karşılaştırma yazısı ve aracla çift yönlü iç bağlantılar.
 * Araç mantığı: tests/unit/drive-labels-checker.test.ts.
 */

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const KNOWN_PATHS = new Set(["/", "/pricing", "/demo", "/drive-labels-checker", ...BLOG_POSTS.map((p) => `/blog/${p.slug}`)]);

describe("araç sonuçları ve SSS yalnız var olan sayfalara bağlanır", () => {
  it("seçeneklerin ve SSS'nin bağlantıları var olan sayfalara gider", () => {
    const combos: CheckerAnswers[] = [{ account: "personal", edition: null, labelsInDrive: null }];
    for (const e of EDITION_CHOICES) combos.push({ account: "workspace", edition: e.id, labelsInDrive: null });
    for (const a of combos) {
      for (const o of evaluateChecker(a).options) if (o.href) expect(KNOWN_PATHS.has(o.href), o.href).toBe(true);
    }
    for (const f of CHECKER_FAQ) if (f.href) expect(KNOWN_PATHS.has(f.href), f.href).toBe(true);
  });
});

describe("iç bağlantılar (sitemap dışında): araç ve üç yazı birbirine bağlı", () => {
  const link = (slug: string) => getPostBySlug(slug)!;
  const linksOf = (slug: string) =>
    parseInline(
      link(slug)
        .blocks.flatMap((b) => (b.type === "ul" || b.type === "ol" ? b.items : b.type === "table" ? b.rows.flat() : [b.text]))
        .join("\n"),
    )
      .filter((t) => t.kind === "link")
      .map((t) => (t.kind === "link" ? t.href : ""));

  it("sınırlar yazısı hem araca hem karşılaştırmaya, personal-gmail yazısı da ikisine bağlanır", () => {
    expect(linksOf("google-drive-labels-limits")).toEqual(expect.arrayContaining(["/drive-labels-checker", "/blog/folderpls-vs-google-drive-labels"]));
    expect(linksOf("tag-google-drive-files-personal-gmail")).toEqual(expect.arrayContaining(["/drive-labels-checker"]));
    expect(linksOf("folderpls-vs-google-drive-labels")).toEqual(
      expect.arrayContaining(["/drive-labels-checker", "/pricing", "/blog/tag-google-drive-files-personal-gmail", "/blog/google-drive-labels-limits"]),
    );
  });

  it("değişen iki eski yazının JSON-LD dateModified tarihi güncellendi", () => {
    expect(link("google-drive-labels-limits").updated).toBe("2026-10-14");
    expect(link("tag-google-drive-files-personal-gmail").updated).toBe("2026-10-14");
  });

  it("karşılaştırma bileşeni ve altbilgi araca/karşılaştırmaya bağlanır; veri tarihi bugünkü okumayla aynı", () => {
    const component = read("components/landing/drive-labels-comparison.tsx");
    expect(component).toContain('"/drive-labels-checker"');
    expect(component).toContain('"/blog/folderpls-vs-google-drive-labels"');
    expect(read("components/landing/footer.tsx")).toContain('href="/drive-labels-checker"');
    expect(COMPARISON_CHECKED_ON).toBe(CHECKER_CHECKED_ON);
  });

  it("site haritasında karşılaştırma yazısı kendi tarihiyle var", () => {
    const byUrl = new Map(sitemap().map((e) => [e.url, e]));
    const post = byUrl.get(`${SITE_URL}/blog/folderpls-vs-google-drive-labels`);
    expect(post).toBeDefined();
    expect(post!.lastModified).toEqual(new Date("2026-10-14"));
  });
});

describe("150 sınırı sitenin her yerinde aynı temkinli dille yazılır (doğrulayıcı bulgusu)", () => {
  // Google'ın iki sayfası farklı yazıyor: Drive Help "dosya başına 150", Admin Help "kuruluş başına 150, dosya başına
  // herhangi bir sayı". Eski yazı ve /pricing satırı düz olgu olarak "150" demeye devam ederse site kendiyle çelişir.
  const limits = getPostBySlug("google-drive-labels-limits")!;
  const limitsText = JSON.stringify(limits);

  it("eski sınırlar yazısı 150'yi düz olgu olarak yazmaz; iki sayfanın farkını söyler ve iki kaynağa dayanır", () => {
    expect(limitsText).not.toContain("A file can carry up to 150 labels");
    expect(limitsText).toContain("Drive Help says a file can carry up to 150 labels");
    expect(limitsText).toContain("an organization can create up to 150 labels");
    expect(limitsText).toContain("a file can carry any number");
    expect(limitsText).toContain("word the limit differently");
  });

  it("eski yazının 'kontrol edildi' notu ve kaynakları bu turdaki okumayla aynı gün; updated tarihi içerik değişimini yansıtır", () => {
    expect(limitsText).toContain("Checked on 14 October 2026");
    expect(limitsText).not.toContain("27 September 2026");
    for (const slug of ["google-drive-labels-limits", "tag-google-drive-files-personal-gmail"]) {
      const post = getPostBySlug(slug)!;
      expect(post.updated, slug).toBe("2026-10-14");
      for (const s of post.sources) expect(s.accessed, `${slug}/${s.id}`).toBe(CHECKER_CHECKED_ON);
    }
  });

  it("karşılaştırma bileşeninin 'dosya başına' satırı iki sayfanın sözünü de taşır ve iki kaynağa bağlanır", () => {
    const row = COMPARISON_ROWS.find((r) => r.id === "per-file")!;
    expect(row.driveLabels.en).toContain("Drive Help says up to 150 per file");
    expect(row.driveLabels.en).toContain("any number per file");
    expect(row.driveLabels.tr).toContain("kuruluş başına en fazla 150");
    expect(row.sourceIds).toEqual(["editions", "apply"]);
    // düz "Up to 150" hâlâ yok
    expect(JSON.stringify(COMPARISON_ROWS)).not.toMatch(/"Up to 150"|"En fazla 150"/);
  });
});

describe("karşılaştırma yazısı: FolderPls vs Google Drive Labels", () => {
  const post = getPostBySlug("folderpls-vs-google-drive-labels")!;
  const text = JSON.stringify(post);

  it("var, tarihli ve araca bağlanır", () => {
    expect(post).toBeDefined();
    expect(post.date).toBe("2026-10-14");
    expect(post.seoTitle).toContain("Google Drive");
    expect(text).toContain("](/drive-labels-checker)");
    expect(text).toContain("](/pricing)");
  });

  it("tüm kaynaklar bugünkü okumayla işaretli; üç kaynak var", () => {
    expect(post.sources.map((s) => s.id)).toEqual(["editions", "apply", "organize"]);
    for (const s of post.sources) expect(s.accessed).toBe(CHECKER_CHECKED_ON);
  });

  it("ürün cümlesi taşıma özelliğiyle çelişmez: 'etiketleme taşımaz', kopyala/taşı/sil yalnız kullanıcı isterse", () => {
    expect(text).toContain("Tagging never moves a file. FolderPls can also copy, move, rename and delete files, but only when you choose to.");
    expect(text).not.toMatch(/never move your files|Files never move|files moved: 0/i);
  });

  it("Google'ın iki sayfasının 150 sınırını farklı yazdığı dürüstçe söylenir", () => {
    expect(text).toContain("Drive Help says up to 150 labels per file");
    expect(text).toContain("an organization can create up to 150 labels");
    expect(text).toContain("disagree on the 150 limit");
  });

  it("Drive Labels'ın üstün olduğu durumlar yazıda var (adil karşılaştırma)", () => {
    expect(text).toContain("Choose Drive Labels if");
    expect(text).toMatch(/Data Loss Prevention \(DLP\)/);
  });

  it("'AI' kelimesi geçmez (Google'ın tüketici plan adı bile): sürüm adları dışında plan adı yazılmaz", () => {
    expect(text).not.toMatch(/\bAI\b/);
    expect(text).toContain("certain paid consumer plans");
  });
});

describe("Drive Labels comparison: folders and bulk rows (Google pages re-read 2026-10-19)", () => {
  it("keeps the folders row sourced to the admin page and the bulk row to the Drive Help 100-file limit", () => {
    const folders = COMPARISON_ROWS.find((r) => r.id === "folders")!;
    expect(folders.sourceIds).toContain("editions");
    expect(folders.driveLabels.en).toMatch(/folders/);
    const bulk = COMPARISON_ROWS.find((r) => r.id === "bulk")!;
    expect(bulk.sourceIds).toContain("apply");
    expect(bulk.driveLabels.en).toMatch(/100 files/);
    expect(bulk.driveLabels.tr).toMatch(/100 dosya/);
  });
});
