import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import type { Metadata } from "next";
import { CONTACT_EMAIL, PROJECT_ISSUES_URL, SITE_URL } from "@/lib/constants/site";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/og";
import { PAGE_META } from "@/lib/seo/page-meta";

const siteUrl = SITE_URL;

export const metadata: Metadata = {
  title: PAGE_META.about.title,
  description: PAGE_META.about.description,
  keywords: [
    "about FolderPls",
    "Google Drive tagging",
    "metadata organization"
  ],
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: PAGE_META.about.ogTitle,
    description: PAGE_META.about.ogDescription,
    url: `${siteUrl}/about`,
  },
  alternates: {
    canonical: `${siteUrl}/about`,
  },
};

const paragraph = "text-muted-foreground";
const ruled = "border-t border-border/50";

function WhyWeBuiltIt() {
  return (
    <section className={`my-12 pt-8 ${ruled}`}>
      <h2 className="mb-4 text-2xl font-bold">Why We Built It</h2>
      <p className={`mb-4 ${paragraph}`}>
        As clients and projects pile up, Google Drive folders turn into a labyrinth. Finding a
        specific file means opening nested folders one by one. A structure like
        &quot;Clients &gt; Acme &gt; 2024 &gt; Final&quot; that once made sense now takes
        several clicks just to reach one document.
      </p>
      <p className={paragraph}>
        FolderPls takes a metadata-first approach. Instead of moving files or changing your
        existing Drive structure, you tag the files you pick with your own labels. Think of it
        like mise en place in a professional kitchen: everything stays in its place, but it is
        organized and ready when you need it. Your Drive stays as it is, while FolderPls gives
        you a filterable view of those files by client, status, year, or any other label that
        matters to your work.
      </p>
    </section>
  );
}

export default function AboutRoute() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <Navbar />
      <main className="flex-1">
        <article className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-8 text-center text-4xl font-bold md:text-5xl">About FolderPls</h1>

            <div className="space-y-8 text-lg leading-relaxed">
              <p className={paragraph}>
                FolderPls is a small,
                free, open-source and non-profit tool that does one thing: it lets you tag the files in your Google Drive with your own
                labels, so you can find them again without moving anything.
              </p>

              <WhyWeBuiltIt />

              <p className={`mt-12 ${paragraph}`}>
                Questions or feedback?{" "}
                <a
                  href={CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}` : PROJECT_ISSUES_URL}
                  className="text-foreground underline underline-offset-2 hover:no-underline"
                >
                  {CONTACT_EMAIL ? `Write to ${CONTACT_EMAIL}` : "Open an issue on GitHub"}
                </a>
                .
              </p>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
