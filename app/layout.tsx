import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, Coiny } from "next/font/google"; // Using Inter for clean typography
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n/i18n-context";
import { BRAND_LOGO_SRC } from "@/lib/brand";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/constants/site";
import { MotionRuntime } from "@/components/motion/motion-runtime";
import { SITE_DESCRIPTION, SITE_SOCIAL_DESCRIPTION, SITE_TITLE, TITLE_SUFFIX } from "@/lib/seo/page-meta";
import { TR_PATH_FIRST_PAINT_SCRIPT } from "@/lib/i18n/page-lang";
import { NONCE_REQUEST_HEADER } from "@/lib/security/csp";

const inter = Inter({ subsets: ["latin"] });
const coiny = Coiny({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-coiny"
});

const siteUrl = SITE_URL;

// Panel rotalarında (/dashboard…, ve panel bileşenlerini yeniden kullanan /demo) ilk boyama JS'ten ve hidrasyondan önce olur;
// o ana kadar body pazarlama sitesinin krem zeminini gösterirdi. AppScope'un
// hidrasyonda koyduğu html[data-fp-app] işaretini yol eşleşince hemen koyar
// (AppScope çıkışta kaldırır). Yalnız bir öznitelik; içerik/stil üretmez.
const PANEL_FIRST_PAINT_SCRIPT =
  'if(/^\\/(dashboard|demo)(\\/|$)/.test(location.pathname))document.documentElement.setAttribute("data-fp-app","")';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_TITLE,
    // Şablon uzunluğu lib/seo/page-meta.ts TITLE_SUFFIX ile aynı olmalı (testle kilitli).
    template: `%s${TITLE_SUFFIX}`
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Google Drive organization",
    "file management",
    "metadata tagging",
    "Drive file organizer",
    "cloud storage organization",
    "file tagging system",
    "Google Drive metadata",
    "file search",
    "digital asset management",
    "Drive file labels",
    "file organization tool",
    "cloud file management",
    "Drive productivity",
    "file filtering",
    "metadata management",
    "Drive workspace",
    "file categorization",
    "Drive integration",
    "file finder"
  ],
  authors: [{ name: "FolderPls" }],
  creator: "FolderPls",
  publisher: "FolderPls",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // Icons come from app/icon.png, app/apple-icon.png and app/favicon.ico.
  // The web manifest is app/manifest.ts (served at /manifest.webmanifest); Next
  // links it automatically, so no `manifest` field here.
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "FolderPls",
    title: SITE_TITLE,
    description: SITE_SOCIAL_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_SOCIAL_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  category: "productivity",
  classification: "File Management Software",
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "FolderPls",
  "applicationCategory": "ProductivityApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Free and open source. No paid plans."
  },
  "description": "Organize your Google Drive files without moving them. Add metadata tags, labels, and filters to find files instantly.",
  "url": siteUrl,
  "author": {
    "@type": "Organization",
    "name": "FolderPls",
    "url": siteUrl
  },
  "featureList": [
    "Metadata tagging system",
    "Google Drive integration",
    "File filtering and search",
    "Zero migration required",
    "Custom labels and tags",
    "Multiple view modes",
    "File preview"
  ]
};

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "FolderPls",
  "url": siteUrl,
  "logo": `${siteUrl}${BRAND_LOGO_SRC}`,
  "description": "FolderPls is a free, open-source tool for organizing Google Drive files with tags without moving them.",
  ...(CONTACT_EMAIL
    ? {
        "contactPoint": {
          "@type": "ContactPoint",
          "email": CONTACT_EMAIL,
          "contactType": "Support"
        }
      }
    : {})
};

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "FolderPls",
  "url": siteUrl,
  "inLanguage": ["en", "tr"]
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // proxy.ts'in istek başına ürettiği nonce. headers() okumak her sayfayı istek anında üretir;
  // sıkı CSP'de Next'in kendi betikleri de bu nonce'u taşımak zorunda (bkz. lib/security/csp.ts).
  const nonce = (await headers()).get(NONCE_REQUEST_HEADER) ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: PANEL_FIRST_PAINT_SCRIPT }} />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: TR_PATH_FIRST_PAINT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
        />
      </head>
      <body className={`${inter.className} ${coiny.variable} min-h-screen antialiased`}>
        <ThemeProvider
          nonce={nonce}
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider>
              {children}
            <MotionRuntime />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
