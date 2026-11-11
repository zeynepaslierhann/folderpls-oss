import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Pricing } from "@/components/landing/pricing";
import { DriveLabelsComparison } from "@/components/landing/drive-labels-comparison";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants/site";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/og";
import { PAGE_META } from "@/lib/seo/page-meta";

const siteUrl = SITE_URL;

export const metadata: Metadata = {
  title: PAGE_META.pricing.title,
  description: PAGE_META.pricing.description,
  keywords: [
    "FolderPls pricing",
    "file organization pricing",
    "Google Drive tool cost",
    "free Google Drive tagging",
    "free file organizer",
    "open source Drive organizer"
  ],
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: PAGE_META.pricing.ogTitle,
    description: PAGE_META.pricing.ogDescription,
    url: `${siteUrl}/pricing`,
  },
  alternates: {
    canonical: `${siteUrl}/pricing`,
  },
};

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <Navbar ctaEmphasis="muted" />
      <main id="main-content" className="flex-1">
        <Pricing headingLevel="h1" />
        <DriveLabelsComparison variant="full" />
      </main>
      <Footer />
    </div>
  );
}
