import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { legalMetadata } from "@/lib/legal/metadata";
import { PRIVACY_POLICY } from "@/lib/legal/privacy-policy";
import { LEGAL_PATHS } from "@/lib/legal/types";

const content = PRIVACY_POLICY.en;

export const metadata: Metadata = legalMetadata(content, "privacy");

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      content={content}
      alternate={{ href: LEGAL_PATHS.privacy.tr, label: "Türkçe: Gizlilik Politikası ve KVKK Aydınlatma Metni", locale: "tr" }}
    />
  );
}
