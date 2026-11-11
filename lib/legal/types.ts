/**
 * Legal document content model (privacy policy, terms of service).
 *
 * Content lives in plain typed objects so the TR and EN versions can be
 * reviewed side by side and rendered by one server component
 * (components/legal/legal-document.tsx). URLs and e-mail addresses inside
 * text are auto-linked by the renderer.
 */

export type LegalLocale = "en" | "tr";

export type LegalBlock =
  | { readonly type: "p"; readonly text: string }
  | { readonly type: "h3"; readonly text: string }
  | { readonly type: "ul"; readonly items: readonly string[] }
  /** Visually emphasised statement (e.g. the Google "Limited Use" disclosure). */
  | { readonly type: "callout"; readonly text: string };

export interface LegalSection {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly LegalBlock[];
}

export interface LegalDocumentContent {
  readonly locale: LegalLocale;
  readonly title: string;
  readonly metaTitle: string;
  readonly metaDescription: string;
  readonly lastUpdatedLabel: string;
  readonly lastUpdated: string;
  readonly tocLabel: string;
  readonly intro: readonly string[];
  readonly sections: readonly LegalSection[];
}

/** Canonical paths, shared by pages, sitemap, footer and the consent notice. */
export const LEGAL_PATHS = {
  privacy: { en: "/privacy-policy", tr: "/tr/gizlilik-politikasi" },
  terms: { en: "/terms-of-service", tr: "/tr/kullanim-sartlari" },
} as const satisfies Record<string, Record<LegalLocale, string>>;

/** ISO date of the current legal texts (used for sitemap lastModified). */
export const LEGAL_LAST_UPDATED_ISO = "2026-11-11";

export const p = (text: string): LegalBlock => ({ type: "p", text });
export const h3 = (text: string): LegalBlock => ({ type: "h3", text });
export const ul = (...items: string[]): LegalBlock => ({ type: "ul", items });
export const callout = (text: string): LegalBlock => ({ type: "callout", text });
