import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/og";
import type { PageMeta } from "@/lib/seo/page-meta";

/**
 * Bir sayfanın sosyal kartları (Open Graph + X/Twitter), {@link PageMeta}'nın ogTitle/ogDescription çiftinden.
 *
 * Neden var: Next.js sayfa düzeyindeki `openGraph` nesnesini kökünkinin YERİNE koyar (birleştirmez). Sayfa yalnız
 * title/description/images yazarsa `og:type` ve `og:site_name` kaybolur; `twitter` hiç yazılmazsa X kartı ana sayfa
 * başlığını ve açıklamasını gösterir (doğrulayıcı bulgusu, 14 Eki 2026). Yeni pazarlama sayfaları bunu kullanır.
 */
export function socialCards(meta: PageMeta, url: string): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      siteName: "FolderPls",
      locale: "en_US",
      url,
      title: meta.ogTitle,
      description: meta.ogDescription,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.ogTitle,
      description: meta.ogDescription,
      images: [DEFAULT_OG_IMAGE.url],
    },
  };
}
