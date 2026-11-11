import type { Locale } from "./i18n";

/**
 * `<html lang>` değeri (WCAG 3.1.1, arama motoru dil ipucu).
 *
 * Kök düzen tek ve statiktir: sunucu HTML'i her sayfada `lang="en"` basar. Arayüz dili
 * (`Locale`) kullanıcının seçimiyle istemcide değişir ve `<html lang>` buna uyar. Ancak
 * `/tr/…` yolları (Türkçe gizlilik/şartlar) arayüz dilinden BAĞIMSIZ olarak her zaman Türkçe,
 * {@link ENGLISH_CONTENT_PATHS} ise her zaman İngilizce içeriktir; bu yollarda `lang` arayüz diline
 * değil içeriğe uymalıdır.
 *
 * Sınır (dürüstçe): bu, JS çalıştıktan sonraki DOM'u düzeltir (ekran okuyucular, JS çalıştıran
 * tarayıcı/tarayıcılar). JS çalıştırmayan bir istemci hâlâ `lang="en"` görür; orada ana içerik
 * `<main lang="tr">` ile (components/legal/legal-document.tsx) işaretlidir. Sunucu HTML'inde
 * `<html lang="tr">` için `/tr` yollarına AYRI bir kök düzen gerekir (app/ yeniden yapılandırması).
 */
export function isTurkishContentPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === "/tr" || pathname.startsWith("/tr/");
}

/**
 * Birincil içeriği yalnız İngilizce olan pazarlama sayfaları. Bu sayfalar arayüz dili Türkçe seçilse
 * bile İngilizce kalır (yalnız Navbar/Footer çevrilir); `lang="tr"` bu durumda ekran okuyucuya İngilizce
 * metni Türkçe okuttururdu (WCAG 3.1.1). Liste tests/unit/page-lang.test.ts ile hem `app/(marketing)`
 * klasörüyle hem sayfa kaynaklarıyla karşılaştırılır; yeni sayfa eklenince sınıflandırmaya zorlanır.
 * Önek eşleşir: "/blog" -> "/blog/…" (ama "/blogger" değil).
 */
export const ENGLISH_CONTENT_PATHS = [
  "/about",
  "/blog",
  "/changelog",
  "/contact",
  "/demo",
  "/drive-labels-checker",
  "/features",
  "/integrations",
  "/privacy-policy",
  "/terms-of-service",
] as const;

export function isEnglishContentPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return ENGLISH_CONTENT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function documentLang(pathname: string | null | undefined, uiLocale: Locale): Locale {
  if (isTurkishContentPath(pathname)) return "tr";
  if (isEnglishContentPath(pathname)) return "en";
  return uiLocale;
}

/**
 * İlk boyamadan önce (hidrasyon beklemeden) `lang`'ı düzeltir; app/layout.tsx içinde satır içi
 * betik olarak çalışır. Mantık {@link isTurkishContentPath} ile aynıdır (testle kilitli).
 */
export const TR_PATH_FIRST_PAINT_SCRIPT =
  'if(/^\\/tr(\\/|$)/.test(location.pathname))document.documentElement.lang="tr"';
