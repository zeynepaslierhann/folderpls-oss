/**
 * Sayfa başlıkları ve açıklamaları — TEK kaynak.
 *
 * Arama sonucunda kesilmesin diye: render edilen <title> (kök şablonu dahil) en çok
 * {@link MAX_TITLE} karakter, açıklama en çok {@link MAX_DESCRIPTION} karakter.
 * Sınırlar tests/unit/seo-metadata-limits.test.ts ile kilitlidir. Kök şablon
 * ("%s | FolderPls") `TITLE_SUFFIX` kadar yer tutar, bu yüzden sayfa başlıkları
 * {@link MAX_PAGE_TITLE} karakteri geçmez.
 *
 * Metinler yalnız kodda doğrulanmış şeyi söyler (yapay zekâ, "tüm Drive",
 * beta, kart sözü yok; bkz. tests/unit/claim-scan.test.ts).
 */

export const MAX_TITLE = 60;
export const MAX_DESCRIPTION = 160;

/** app/layout.tsx `title.template` ile aynı olmalı ("%s | FolderPls"). */
export const TITLE_SUFFIX = " | FolderPls";
export const MAX_PAGE_TITLE = MAX_TITLE - TITLE_SUFFIX.length;

/** Ana sayfa: kök başlığı şablon almaz (title.default). */
export const SITE_TITLE = "FolderPls: Tag Google Drive Files Without Moving Them";
export const SITE_DESCRIPTION =
  "Tag your Google Drive files by client, status and year. Filter in seconds and open the file in Drive. Nothing moves.";
export const SITE_SOCIAL_DESCRIPTION = "Tag your Google Drive files by client, status and year. Nothing moves.";

export interface PageMeta {
  /** <title> için (şablon eklenir). */
  readonly title: string;
  readonly description: string;
  /** Sosyal kart başlığı/açıklaması (şablon eklenmez). */
  readonly ogTitle: string;
  readonly ogDescription: string;
}

export const PAGE_META = {
  features: {
    title: "Features: Tags, Filters, Graph View",
    description:
      "Tag Drive files with your own labels, search by name or label, switch between list and grid views and preview files. Nothing moves in Drive.",
    ogTitle: "FolderPls Features: Tags, Filters, Graph View",
    ogDescription: "Tag Drive files with your own labels, search by name or label, and open any file in Drive.",
  },
  integrations: {
    title: "Google Drive Integration",
    description:
      "FolderPls only sees the Drive files you pick, and your tags stay in your browser. How the Google Drive connection works and how to back up your tags.",
    ogTitle: "FolderPls and Google Drive",
    ogDescription: "FolderPls only sees the Drive files you pick. Your tags stay in your browser.",
  },
  pricing: {
    title: "Pricing: Free, No Paid Plans",
    description:
      "FolderPls is free and open source. There are no paid plans, trials or quotas, and no account to create. Tag Google Drive files without moving them.",
    ogTitle: "FolderPls Pricing: Free, No Paid Plans",
    ogDescription: "Free and open source. No paid plans, no trials, no quotas. Tag Google Drive files without moving them.",
  },
  about: {
    title: "About FolderPls",
    description:
      "FolderPls is a small, free, open-source tool by two developers for tagging Google Drive files with your own labels, without moving anything.",
    ogTitle: "About FolderPls",
    ogDescription: "A small tool by two developers for tagging Google Drive files without moving them.",
  },
  changelog: {
    title: "Changelog",
    description: "Release notes for FolderPls: what changed in each version.",
    ogTitle: "FolderPls Changelog",
    ogDescription: "Release notes for FolderPls: what changed in each version.",
  },
  contact: {
    title: "Contact",
    description:
      "Email the FolderPls developers and read answers to common questions about tagging Google Drive files.",
    ogTitle: "Contact FolderPls",
    ogDescription: "Email the FolderPls developers and read answers to common questions.",
  },
  blog: {
    title: "Blog: Google Drive Tagging Guides",
    description:
      "Guides to tagging, searching and structuring Google Drive: Drive Labels limits, alternatives, search operators, team folders and how FolderPls compares.",
    ogTitle: "FolderPls Blog: Google Drive Tagging Guides",
    ogDescription: "What Google Drive Labels can and can't do, tagging on personal Gmail, and honest comparisons.",
  },
  driveLabelsChecker: {
    title: "Does My Google Account Have Drive Labels?",
    description:
      "Find out in two clicks whether your Google account has Drive Labels, based on Google's supported-editions list. No sign-in, no Drive access.",
    ogTitle: "Does my Google account have Drive Labels?",
    ogDescription: "A free checker based on Google's supported-editions list. It runs in your browser and never touches your Drive.",
  },
  demo: {
    title: "Try FolderPls With Sample Data",
    description:
      "Search, filter and tag made-up Drive files in your browser. No sign-in, no Google Drive access, nothing saved. Tagging never moves a file.",
    ogTitle: "Try FolderPls with sample data",
    ogDescription: "Search, filter and tag made-up Drive files in your browser. No sign-in, nothing saved.",
  },
} as const satisfies Record<string, PageMeta>;

export type PageMetaKey = keyof typeof PAGE_META;

/** Tarayıcı sekmesinde/arama sonucunda görünen başlık (kök şablon dahil). */
export function renderedTitle(pageTitle: string): string {
  return `${pageTitle}${TITLE_SUFFIX}`;
}
