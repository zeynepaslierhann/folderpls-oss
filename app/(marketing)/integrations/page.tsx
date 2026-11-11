import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { CheckIcon } from "@/components/icons";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/constants/site";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/og";
import { PAGE_META } from "@/lib/seo/page-meta";

const siteUrl = SITE_URL;

export const metadata: Metadata = {
  title: PAGE_META.integrations.title,
  description: PAGE_META.integrations.description,
  keywords: [
    "Google Drive integration",
    "Drive API",
    "file management integration",
    "cloud storage integration",
    "productivity tools integration"
  ],
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: PAGE_META.integrations.ogTitle,
    description: PAGE_META.integrations.ogDescription,
    url: `${siteUrl}/integrations`,
  },
  alternates: {
    canonical: `${siteUrl}/integrations`,
  },
};

function ConnectionFact({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <CheckIcon className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
      <div>
        <h3 className="mb-1 font-semibold">{heading}</h3>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}

export default function IntegrationsRoute() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <Navbar />
      <main className="flex-1">
        <section className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <header className="mb-12 text-center">
              <h1 className="mb-4 text-4xl font-bold md:text-5xl">How It Connects</h1>
              <p className="text-xl text-muted-foreground">
                FolderPls works on top of Google Drive and leaves your files where they are
              </p>
            </header>

            <article className="rounded-xl border border-border/50 bg-card/50 p-8">
              <h2 className="mb-4 text-2xl font-bold">Google Drive</h2>
              <p className="mb-6 text-muted-foreground">
                FolderPls adds a tagging layer on top of Google Drive and leaves your existing file structure as it is.
              </p>

              <ul className="space-y-4">
                <ConnectionFact heading="Only the files you pick">
                  FolderPls uses Google&apos;s drive.file permission, so it can only see the files and
                  folders you choose in the Google Picker (or create through FolderPls, including its backup file). Your files
                  stay exactly where they are in Drive.
                </ConnectionFact>

                <ConnectionFact heading="Tags stay in your browser">
                  Your tags, notes and relations are stored in your browser, not on our servers or in Google Drive, so Drive&apos;s
                  own search won&apos;t see them. Each Google account you connect keeps its own tags. Open any file in Drive with one click.
                </ConnectionFact>

                <ConnectionFact heading="Works With Your File Types">
                  You can pick and tag Google Docs, Sheets, Slides, PDFs, images, videos and
                  other files in your Drive.
                </ConnectionFact>

                <ConnectionFact heading="Backed up while Drive is connected">
                  Under Data and Drive, &quot;Export&quot; downloads your labels and notes as JSON. While Drive is connected, FolderPls also writes
                  them to a visible folderpls-tags.json file in that account&apos;s own Drive a few seconds after a change. If the Google connection ends, changes wait in
                  your browser until you reconnect. &quot;Sync with Drive&quot; runs the same backup on demand. Moving tags to another device takes one of these backups.
                </ConnectionFact>

                <ConnectionFact heading="Google handles the connection">
                  You approve access on Google&apos;s own screen, so FolderPls never sees your Google password. The access token stays in
                  your browser tab for about an hour, then you click reconnect. You can revoke access anytime from your Google account settings.
                </ConnectionFact>
              </ul>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
