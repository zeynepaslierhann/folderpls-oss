import type { LegalLocale } from "./types";

/**
 * Gizlilik politikasında geçen barındırma sağlayıcısı. Kopyayı kim yayınlıyorsa
 * kendi sağlayıcısını `HOSTING_PROVIDER` (şirket adı) ve isteğe bağlı
 * `HOSTING_REGION` (sunucuların bulunduğu yer, ör. "Frankfurt") ile belirtir.
 * Değer derleme anında okunur. Boşsa metinde açık bir yer tutucu görünür:
 * yanlış bir sağlayıcı adı yayımlanmasın.
 */
export interface HostingInfo {
  /** Cümle içinde kullanılan ad; tanımlı değilse yer tutucu. */
  name: string;
  region?: string;
  configured: boolean;
}

const PLACEHOLDER: Record<LegalLocale, string> = {
  en: "[hosting provider: set HOSTING_PROVIDER]",
  tr: "[barındırma sağlayıcısı: HOSTING_PROVIDER tanımlanmalı]",
};

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 120) : undefined;
}

export function hostingInfo(locale: LegalLocale, env: Record<string, string | undefined> = process.env): HostingInfo {
  const name = clean(env.HOSTING_PROVIDER);
  const region = clean(env.HOSTING_REGION);
  return { name: name ?? PLACEHOLDER[locale], ...(region ? { region } : {}), configured: Boolean(name) };
}
