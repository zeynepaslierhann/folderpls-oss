import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { legalMetadata } from "@/lib/legal/metadata";
import { TERMS_OF_SERVICE } from "@/lib/legal/terms-of-service";
import { LEGAL_PATHS } from "@/lib/legal/types";

const content = TERMS_OF_SERVICE.tr;

export const metadata: Metadata = legalMetadata(content, "terms");

export default function KullanimSartlariPage() {
  return (
    <LegalDocument
      content={content}
      alternate={{ href: LEGAL_PATHS.terms.en, label: "English: Terms of Service", locale: "en" }}
    />
  );
}
