"use client";

import type { CSSProperties } from "react";
import { CheckIcon, CodeIcon, FolderLockIcon, ExpiryIcon, GraphIcon, ExternalLinkIcon, TagsIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n/i18n-context";

const ITEMS = [
  { icon: CheckIcon, en: "Works with any Google Drive account", tr: "Her Google Drive hesabıyla çalışır" },
  { icon: FolderLockIcon, en: "Tagging never moves a file", tr: "Etiketleme dosyayı taşımaz" },
  { icon: TagsIcon, en: "Your own tags, no admin needed", tr: "Kendi etiketlerin, yönetici gerekmez" },
  { icon: ExpiryIcon, en: "Tags with an end date", tr: "Bitiş tarihli etiketler" },
  { icon: GraphIcon, en: "Knowledge graph view", tr: "Bilgi grafiği görünümü" },
  { icon: CodeIcon, en: "Free and open source", tr: "Ücretsiz ve açık kaynak" },
  { icon: ExternalLinkIcon, en: "Open in Drive, one click", tr: "Tek tıkla Drive'da aç" },
];

/**
 * Ambient ribbon of value props under the hero. Infinite transform-only
 * marquee (pauses on hover/focus, off-screen and under reduced motion).
 */
export function TagRibbon() {
  const { locale } = useI18n();
  const isTr = locale === "tr";

  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-3 pr-3" aria-hidden={hidden || undefined}>
      {ITEMS.map((item) => (
        <li
          key={item.en}
          className="flex items-center gap-2 whitespace-nowrap rounded-full border border-border/70 bg-background/70 px-4 py-2 text-sm font-medium text-foreground/80 shadow-sm backdrop-blur-sm"
        >
          <item.icon className="h-4 w-4 text-brand-ocean-ink" aria-hidden="true" />
          {isTr ? item.tr : item.en}
        </li>
      ))}
    </ul>
  );

  return (
    <div
      data-ambient
      className="relative overflow-hidden border-y border-border/50 bg-muted/20 py-5 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]"
    >
      <div className="ambient-marquee flex w-max" style={{ "--marquee-duration": "48s" } as CSSProperties}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
