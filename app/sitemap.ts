import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants/site";
import { LEGAL_LAST_UPDATED_ISO, LEGAL_PATHS } from "@/lib/legal/types";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { CHECKER_CHECKED_ON } from "@/lib/marketing/drive-labels-checker";

// Only indexable pages belong here: listing noindex URLs sends Google mixed signals.
const MARKETING_ROUTES = ["/features", "/pricing", "/integrations", "/about", "/contact", "/changelog", "/blog", "/drive-labels-checker", "/demo"];

/**
 * `lastmod` yalnız GERÇEK bir içerik tarihi biliniyorsa yazılır (blog yazıları,
 * yasal metinler, blog dizini = en yeni yazı). Önceden ana sayfa ve tüm
 * pazarlama sayfaları build zamanını alıyordu: her deploy'da hepsi "değişti"
 * görünüyor, Google de sitenin lastmod'unu güvenilmez sayıp yok sayıyordu.
 * Bilinmeyen tarih yazılmaz (alan opsiyonel) — yanlış tarih vermekten iyidir.
 */
const LATEST_POST_DATE = BLOG_POSTS.reduce<Date | undefined>((latest, post) => {
  // JSON-LD dateModified ile aynı tarih: güncellenmiş yazıda `updated`, yoksa yayın günü.
  const d = new Date(post.updated ?? post.date);
  return !latest || d > latest ? d : latest;
}, undefined);

export default function sitemap(): MetadataRoute.Sitemap {
  const legalUpdated = new Date(LEGAL_LAST_UPDATED_ISO);

  const legal = Object.values(LEGAL_PATHS).flatMap((paths) =>
    (["en", "tr"] as const).map((locale) => ({
      url: `${SITE_URL}${paths[locale]}`,
      lastModified: legalUpdated,
      changeFrequency: "yearly" as const,
      priority: 0.3,
      alternates: {
        languages: { en: `${SITE_URL}${paths.en}`, tr: `${SITE_URL}${paths.tr}` },
      },
    })),
  );

  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    ...MARKETING_ROUTES.map((route) => ({
      url: `${SITE_URL}${route}`,
      ...(route === "/blog" && LATEST_POST_DATE ? { lastModified: LATEST_POST_DATE } : {}),
      // Araç sayfasının içeriği Google sayfalarına dayanır; "son doğrulama" günü gerçek içerik tarihidir.
      ...(route === "/drive-labels-checker" ? { lastModified: new Date(CHECKER_CHECKED_ON) } : {}),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...BLOG_POSTS.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.updated ?? post.date),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...legal,
  ];
}
