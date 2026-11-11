import type { Metadata } from "next";
import { ExternalLinkIcon } from "@/components/icons";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PostCta } from "@/components/blog/post-cta";
import { DriveLabelsChecker } from "@/components/tools/drive-labels-checker";
import { TransitionLink } from "@/components/motion/transition-link";
import { SITE_URL } from "@/lib/constants/site";
import { PAGE_META } from "@/lib/seo/page-meta";
import { socialCards } from "@/lib/seo/social";
import { formatIsoDate } from "@/lib/utils/date";
import {
  CHECKER_CHECKED_ON,
  CHECKER_FAQ,
  CHECKER_SOURCES,
  SUPPORTED_EDITIONS,
  checkerSourceAnchor,
  checkerSourceNumber,
  type CheckerSourceId,
} from "@/lib/marketing/drive-labels-checker";

const siteUrl = SITE_URL;
const pageUrl = `${siteUrl}/drive-labels-checker`;

export const metadata: Metadata = {
  title: PAGE_META.driveLabelsChecker.title,
  description: PAGE_META.driveLabelsChecker.description,
  keywords: [
    "does my google account have drive labels",
    "google drive labels personal account",
    "google drive labels business starter",
    "which google workspace editions have drive labels",
    "drive labels alternative",
  ],
  ...socialCards(PAGE_META.driveLabelsChecker, pageUrl),
  alternates: {
    canonical: pageUrl,
  },
};

function SourceRef({ id }: { id: CheckerSourceId }) {
  const n = checkerSourceNumber(id);
  return (
    <sup className="ml-0.5">
      <a href={`#${checkerSourceAnchor(id)}`} className="text-brand-ocean-ink hover:underline" aria-label={`Source ${n}`}>
        [{n}]
      </a>
    </sup>
  );
}

export default function DriveLabelsCheckerPage() {
  const checked = formatIsoDate(CHECKER_CHECKED_ON, "en");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: PAGE_META.driveLabelsChecker.ogTitle,
    description: PAGE_META.driveLabelsChecker.description,
    url: pageUrl,
    inLanguage: "en",
    dateModified: CHECKER_CHECKED_ON,
    isPartOf: { "@type": "WebSite", name: "FolderPls", url: siteUrl },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Drive Labels checker", item: pageUrl },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <Navbar />
      <main id="main-content" className="flex-1" lang="en">
        <div className="container mx-auto max-w-4xl px-4 py-14 md:py-20">
          <header className="mb-10 max-w-2xl">
            <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl md:leading-[1.1]">Does my Google account have Drive Labels?</h1>
            <p className="text-lg text-muted-foreground">
              Answer one or two questions. The result follows Google&apos;s own list of supported Workspace editions, and it tells you
              what to do next either way.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Checked against Google&apos;s pages on <time dateTime={CHECKER_CHECKED_ON}>{checked}</time>. Google changes Workspace
              editions, so confirm with your admin before you rely on it.
            </p>
          </header>

          <DriveLabelsChecker />

          <section aria-labelledby="editions-heading" className="mt-16" id="supported-editions">
            <h2 id="editions-heading" className="mb-3 text-2xl font-bold tracking-tight md:text-3xl">
              Which Google Workspace editions support Drive Labels?
            </h2>
            <p className="mb-4 text-foreground/90">
              Google lists these editions as supported.
              <SourceRef id="editions" /> Personal Google accounts are not Workspace editions, and Business Starter is not on the list.
            </p>
            <ul className="grid gap-x-8 gap-y-1.5 pl-5 text-foreground/90 marker:text-brand-ocean-ink sm:grid-cols-2 [&>li]:list-disc">
              {SUPPORTED_EDITIONS.map((edition) => (
                <li key={edition.id}>{edition.name}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="limits-heading" className="mt-14">
            <h2 id="limits-heading" className="mb-3 text-2xl font-bold tracking-tight md:text-3xl">
              What to know before you count on them
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-foreground/90 marker:text-brand-ocean-ink">
              <li>
                Only administrators can create labels. You apply labels an admin has given you access to, and you need edit access to the
                file.
                <SourceRef id="apply" />
              </li>
              <li>
                In the Drive mobile app you can view labels, but you can&apos;t apply or change them.
                <SourceRef id="apply" />
              </li>
              <li>
                On a computer you can apply a label to up to 100 files at once.
                <SourceRef id="apply" />
              </li>
              <li>
                Labels can go on any file in Drive, but not on folders, shortcuts, shared drives or files owned by another organization.
                <SourceRef id="editions" />
              </li>
              <li>
                Google&apos;s two pages word the label limit differently. Drive Help says a file can carry up to 150 labels.
                <SourceRef id="apply" /> The admin documentation says an organization can create up to 150 labels and that a file can carry
                any number of them.
                <SourceRef id="editions" /> Check the current pages before you plan around a number.
              </li>
            </ul>
          </section>

          <section aria-labelledby="options-heading" className="mt-14">
            <h2 id="options-heading" className="mb-3 text-2xl font-bold tracking-tight md:text-3xl">
              If you can&apos;t use Drive Labels
            </h2>
            <p className="mb-4 text-foreground/90">
              You still have options. These guides cover them, with sources and with the trade-offs spelled out.
            </p>
            <ul className="list-disc space-y-2 pl-5 text-foreground/90 marker:text-brand-ocean-ink">
              <li>
                <TransitionLink href="/blog/tag-google-drive-files-personal-gmail" className="font-medium text-brand-ocean-ink underline underline-offset-4 hover:no-underline">
                  How to tag Google Drive files on a personal Gmail account
                </TransitionLink>
              </li>
              <li>
                <TransitionLink href="/blog/google-drive-labels-limits" className="font-medium text-brand-ocean-ink underline underline-offset-4 hover:no-underline">
                  Google Drive Labels: who can use them, and the limits to know
                </TransitionLink>
              </li>
              <li>
                <TransitionLink href="/blog/folderpls-vs-google-drive-labels" className="font-medium text-brand-ocean-ink underline underline-offset-4 hover:no-underline">
                  FolderPls vs Google Drive Labels: an honest comparison
                </TransitionLink>
              </li>
            </ul>
          </section>

          <section aria-labelledby="faq-heading" className="mt-14">
            <h2 id="faq-heading" className="mb-5 text-2xl font-bold tracking-tight md:text-3xl">
              Quick answers
            </h2>
            <dl className="space-y-6">
              {CHECKER_FAQ.map((item) => (
                <div key={item.q}>
                  <dt className="mb-1 text-lg font-semibold">{item.q}</dt>
                  <dd className="text-foreground/90">
                    {item.a}
                    {item.sourceId && <SourceRef id={item.sourceId} />}
                    {item.href && (
                      <>
                        {" "}
                        <TransitionLink href={item.href} className="font-medium text-brand-ocean-ink underline underline-offset-4 hover:no-underline">
                          {item.linkLabel ?? "Read more"}
                        </TransitionLink>
                      </>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="sources-heading" className="mt-14 border-t border-border/70 pt-8">
            <h2 id="sources-heading" className="mb-4 text-lg font-semibold">
              Sources
            </h2>
            <ol className="space-y-2 text-sm text-muted-foreground">
              {CHECKER_SOURCES.map((source, i) => (
                <li key={source.id} id={checkerSourceAnchor(source.id)} className="scroll-mt-24">
                  [{i + 1}]{" "}
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground">
                    {source.title}
                    <ExternalLinkIcon className="h-3 w-3" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>{" "}
                  , read on {formatIsoDate(CHECKER_CHECKED_ON, "en")}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <PostCta />
      </main>
      <Footer />
    </div>
  );
}
