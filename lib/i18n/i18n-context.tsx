"use client";

import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { LOCALE_STORAGE_KEY } from "@/lib/constants";
import { Locale, getTranslation } from "./i18n";
import { documentLang } from "./page-lang";

type LocaleContextValue = {
  locale: Locale;
  setLocale(next: Locale): void;
  t(key: string): string;
  /**
   * Tarih biçimi için BCP 47 etiketi. Yalnız {@link FixedLocaleProvider} doldurur; yoksa tarihler
   * tarayıcının diliyle yazılır (panelin eski davranışı).
   */
  dateLocale?: string;
};

const I18nContext = createContext<LocaleContextValue | null>(null);

const isSupportedLocale = (candidate: string | null): candidate is Locale => candidate === "tr" || candidate === "en";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [activeLocale, setActiveLocale] = useState<Locale>("en");
  const pathname = usePathname();

  useEffect(() => {
    const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (!isSupportedLocale(savedLocale)) return;
    // Deferred so the first client render matches the server HTML (EN).
    const localeTimer = setTimeout(() => setActiveLocale(savedLocale), 0);
    return () => clearTimeout(localeTimer);
  }, []);

  // Keep <html lang> in sync with the rendered language (WCAG 3.1.1): screen
  // readers pick pronunciation from it. Previously a returning TR user kept
  // lang="en" because the sync only ran when no locale was saved. The static
  // Turkish legal pages (/tr/…) are Turkish whatever the UI language is (page-lang.ts).
  useEffect(() => {
    document.documentElement.lang = documentLang(pathname, activeLocale);
  }, [activeLocale, pathname]);

  const contextValue: LocaleContextValue = {
    locale: activeLocale,
    setLocale(next) {
      setActiveLocale(next);
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    },
    t: (key) => getTranslation(activeLocale, key),
  };

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

/**
 * Bir alt ağacı sabit bir dile kilitler: kayıtlı dil tercihini okumaz, yazmaz ve `<html lang>`'a dokunmaz.
 * Kullanım: yalnız İngilizce yayımlanan ama panel bileşenlerini yeniden kullanan sayfa (/demo); arayüz dili
 * Türkçe seçilmiş ya da tarayıcısı Türkçe olan bir ziyaretçide sayfa metni İngilizce, satır başlıkları ve
 * tarihler Türkçe karışmasın.
 */
export function FixedLocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: () => {},
      t: (key: string) => getTranslation(locale, key),
      // Metin gibi tarih de sabit dilde yazılır: İngilizce sayfada Türkçe tarayıcıda "2 Eki 2026" çıkmasın.
      dateLocale: locale === "tr" ? "tr-TR" : "en-US",
    }),
    [locale]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n needs an I18nProvider above it in the tree");
  return value;
}
