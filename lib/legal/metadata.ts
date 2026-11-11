import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/og";
import { LEGAL_PATHS, type LegalDocumentContent } from "./types";

type LegalKind = keyof typeof LEGAL_PATHS;

/** Page metadata with canonical + hreflang pair for a legal document. */
export function legalMetadata(content: LegalDocumentContent, kind: LegalKind): Metadata {
  const paths = LEGAL_PATHS[kind];
  const url = paths[content.locale];
  return {
    title: content.metaTitle,
    description: content.metaDescription,
    alternates: {
      canonical: url,
      languages: { en: paths.en, tr: paths.tr, "x-default": paths.en },
    },
    openGraph: {
      type: "article",
      title: `${content.metaTitle} | FolderPls`,
      description: content.metaDescription,
      url,
      locale: content.locale === "tr" ? "tr_TR" : "en_US",
      images: [DEFAULT_OG_IMAGE],
    },
    robots: { index: true, follow: true },
  };
}
