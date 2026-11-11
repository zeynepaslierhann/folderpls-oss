import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { legalMetadata } from "@/lib/legal/metadata";
import { PRIVACY_POLICY } from "@/lib/legal/privacy-policy";
import { LEGAL_PATHS } from "@/lib/legal/types";

const content = PRIVACY_POLICY.tr;

export const metadata: Metadata = legalMetadata(content, "privacy");

export default function GizlilikPolitikasiPage() {
  return (
    <LegalDocument
      content={content}
      alternate={{ href: LEGAL_PATHS.privacy.en, label: "English: Privacy Policy", locale: "en" }}
    />
  );
}
