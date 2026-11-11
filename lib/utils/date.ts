/**
 * Date Utility Functions
 *
 * Centralized date formatting and manipulation utilities.
 */

/**
 * Format an ISO date string for display
 * Returns "—" for invalid or missing dates
 *
 * `locale` verilmezse tarayıcının dili kullanılır (panelin eski davranışı). Sabit bir dilde yayımlanan
 * sayfa (/demo) bir BCP 47 etiketi ("en-US") geçirir; yoksa İngilizce sayfada Türkçe ay adları çıkar.
 */
export function formatDate(iso: string | undefined, locale?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

/**
 * Tarih + saat — detay panelinin tek biçimi (panel spec §2.4):
 * listede formatDate ("Sep 27, 2026"), panelde "Sep 27, 2026, 14:05".
 */
export function formatDateTime(iso: string | undefined, locale?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const MONTH_NAMES = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  tr: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
} as const;

/**
 * "2026-09-27" -> "27 September 2026" / "27 Eylül 2026".
 * Deterministic (no Intl/timezone), so server and client HTML always match.
 */
export function formatIsoDate(iso: string, locale: "en" | "tr"): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTH_NAMES[locale][month - 1]} ${year}`;
}
