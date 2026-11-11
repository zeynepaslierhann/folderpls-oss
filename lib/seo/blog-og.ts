/**
 * Blog yazısı sosyal kartının (app/(marketing)/blog/[slug]/og.png/route.tsx) yerleşim kuralları.
 * Her yazı eskiden aynı genel kartı kullanıyordu; paylaşılan bağlantıda yazının
 * başlığı görünsün diye başlık karta yazılır. Saf fonksiyonlar: Satori/ImageResponse olmadan sınanır.
 */

export const BLOG_OG_SIZE = { width: 1200, height: 630 } as const;

/** Yazının sosyal kart adresi (sabit; JSON-LD ve openGraph/twitter aynı adresi kullanır). */
export function blogOgImageUrl(postUrl: string): string {
  return `${postUrl}/og.png`;
}

/** Kartta başlığa ayrılan en çok karakter; uzun başlık sonuna "…" alır. */
export const OG_TITLE_MAX_CHARS = 100;

export function ogTitle(title: string): string {
  const clean = title.trim().replace(/\s+/g, " ");
  if (clean.length <= OG_TITLE_MAX_CHARS) return clean;
  return `${clean.slice(0, OG_TITLE_MAX_CHARS - 1).trimEnd()}…`;
}

/** Başlık uzunluğuna göre punto: 1200x630 kartta en çok 4 satıra sığar. */
export function ogTitleFontSize(title: string): number {
  const n = ogTitle(title).length;
  if (n <= 40) return 84;
  if (n <= 70) return 68;
  return 56;
}

/** Kartın alt satırı: yazı süresi ve tarih ("7 min read · Sep 27, 2026"). */
export function ogMeta(readingMinutes: number, isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const date = Number.isNaN(d.getTime())
    ? isoDate
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `${readingMinutes} min read · ${date}`;
}
