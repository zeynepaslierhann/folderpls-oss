import type { Metadata } from "next";
import { PanelBrandLogo } from "@/components/brand/panel-brand-logo";
import { TransitionLink } from "@/components/motion/transition-link";
import { DemoSignupLink } from "@/components/demo/demo-signup-link";
import { DemoWorkspace } from "@/components/demo/demo-workspace";
import { LEGAL_PATHS } from "@/lib/legal/types";
import { SITE_URL } from "@/lib/constants/site";
import { PAGE_META } from "@/lib/seo/page-meta";
import { socialCards } from "@/lib/seo/social";

const siteUrl = SITE_URL;
const pageUrl = `${siteUrl}/demo`;

export const metadata: Metadata = {
  title: PAGE_META.demo.title,
  description: PAGE_META.demo.description,
  keywords: ["FolderPls demo", "tag google drive files demo", "google drive tagging tool sample data"],
  ...socialCards(PAGE_META.demo, pageUrl),
  alternates: {
    canonical: pageUrl,
  },
};

const linkClass = "underline underline-offset-4 hover:no-underline";

export default function DemoPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: PAGE_META.demo.ogTitle,
    description: PAGE_META.demo.description,
    url: pageUrl,
    inLanguage: "en",
    isPartOf: { "@type": "WebSite", name: "FolderPls", url: siteUrl },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Demo", item: pageUrl },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-fg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <header className="border-b border-line">
        <div className="mx-auto flex h-12 max-w-6xl items-center gap-4 px-4">
          <TransitionLink href="/" className="flex items-center gap-2 font-[family-name:var(--font-coiny)] text-lg">
            <PanelBrandLogo className="size-5 shrink-0 rounded-sm object-contain" />
            FolderPls
          </TransitionLink>
          <nav aria-label="Site" className="ml-auto flex items-center gap-4 text-sm text-fg-2">
            <TransitionLink href="/features" className="hidden hover:text-fg sm:inline">
              Features
            </TransitionLink>
            <TransitionLink href="/pricing" className="hidden hover:text-fg sm:inline">
              Pricing
            </TransitionLink>
            <DemoSignupLink>Open FolderPls</DemoSignupLink>
          </nav>
        </div>
      </header>

      <main id="main-content" className="flex-1" lang="en">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="mb-8 max-w-2xl">
            <h1 className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">Try FolderPls with sample data</h1>
            <p className="text-lg text-fg-2">
              Search the files, filter by tag, and add or remove a tag. The sample files are made up and aren&apos;t connected to Google Drive,
              and nothing you do here is saved.
            </p>
          </div>

          <DemoWorkspace />

          <section aria-labelledby="real-heading" className="mt-12 max-w-3xl">
            <h2 id="real-heading" className="mb-3 text-xl font-semibold">
              What is real here, and what is not
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-fg-2 marker:text-fg-3">
              <li>
                <span className="text-fg">Real:</span> the list, the tag chips and the file menu are the same components the app uses, and
                search and the tag filters run on the app&apos;s own search engine.
              </li>
              <li>
                <span className="text-fg">Made up:</span> the files, the clients, the tags and the Drive locations. File actions such as copy,
                move, rename and delete are turned off here.
              </li>
              <li>
                <span className="text-fg">Left out:</span> the Google consent screen, the file picker and the connection to your Drive. In the app, FolderPls
                only sees the files you pick, your tags are stored in your browser, and Open in Drive opens the original file.
              </li>
              <li>
                <span className="text-fg">Tagging never moves a file.</span> The Drive location in the details panel stays the same, whatever you
                do with tags.
              </li>
            </ul>
          </section>

          <section aria-labelledby="next-heading" className="mt-12 rounded-xl border border-line p-6 md:p-8">
            <h2 id="next-heading" className="mb-2 text-xl font-semibold">
              Try it on your own Drive
            </h2>
            <p className="mb-4 max-w-xl text-fg-2">
              FolderPls lets you tag the Drive files you pick, filter by label and open the file in Drive. Tagging never moves your files.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <DemoSignupLink>Open FolderPls</DemoSignupLink>
              <TransitionLink href="/pricing" className={`text-sm text-fg-2 ${linkClass}`}>
                See pricing
              </TransitionLink>
              <TransitionLink href="/drive-labels-checker" className={`text-sm text-fg-2 ${linkClass}`}>
                Does your account have Drive Labels?
              </TransitionLink>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm text-fg-2">
          <TransitionLink href={LEGAL_PATHS.privacy.en} className="hover:text-fg">
            Privacy Policy
          </TransitionLink>
          <TransitionLink href={LEGAL_PATHS.terms.en} className="hover:text-fg">
            Terms of Service
          </TransitionLink>
          <TransitionLink href="/contact" className="hover:text-fg">
            Contact
          </TransitionLink>
        </div>
      </footer>
    </div>
  );
}
