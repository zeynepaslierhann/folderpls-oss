import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { CalendarIcon } from "@/components/icons";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants/site";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/og";
import { PAGE_META } from "@/lib/seo/page-meta";

const siteUrl = SITE_URL;

export const metadata: Metadata = {
  title: PAGE_META.changelog.title,
  description: PAGE_META.changelog.description,
  keywords: [
    "FolderPls changelog",
    "file organization updates",
    "product updates",
    "release notes",
    "feature updates"
  ],
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: PAGE_META.changelog.ogTitle,
    description: PAGE_META.changelog.ogDescription,
    url: `${siteUrl}/changelog`,
  },
  alternates: {
    canonical: `${siteUrl}/changelog`,
  },
};

const RELEASES = [
  {
    date: "November 2026",
    version: "3.0.0",
    type: "major",
    items: [
      "FolderPls is now free, non-profit and open source under the MIT License",
      "No accounts: open the app and connect Google Drive when you want to see your files",
      "Labels, notes, properties and collections are stored in your browser",
      "Optional backup: export and import a JSON file, or keep a visible folderpls-tags.json file updated in your own Drive while it is connected",
    ],
  },
  {
    date: "October 2026",
    version: "2.0.0",
    type: "major",
    items: [
      "New dashboard with a command palette (Ctrl/⌘ K) that searches files and labels, including label: filters",
      "Tags with an end date, plus notes and relations between files",
      "Saved filters (smart collections)",
      "Graph view that shows how your tagged files, folders and tags connect",
    ],
  },
  {
    date: "January 26, 2026",
    version: "1.0.0",
    type: "major",
    items: [
      "FolderPls goes live for the first time",
      "Labels you define yourself, each with its own color",
      "Search across files, folders, and labels",
      "Choose between list and grid layouts",
      "Preview images and videos in the app",
      "Google Drive integration with file management",
      "Back and forward buttons work across folders",
      "Actions on a right-click menu",
      "Rename, recolor and remove labels",
      "Pages listing the files and folders you tagged",
    ],
  },
];

function ReleaseEntry({ release }: { release: (typeof RELEASES)[number] }) {
  return (
    <article className="rounded-xl border border-border/50 bg-card/50 p-8">
      <header className="mb-4 flex items-center gap-3">
        <CalendarIcon className="w-5 h-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{release.date}</span>
        <span className="rounded-full bg-brand-lemon/20 px-2 py-1 text-xs font-medium text-brand-lemon">v{release.version}</span>
        {release.type === "major" ? (
          <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs font-medium text-red-500">Major Update</span>
        ) : null}
      </header>
      <ul className="space-y-2">
        {release.items.map((note) => (
          <li key={note} className="flex items-start gap-2">
            <span className="mt-1 text-brand-lemon">•</span>
            <span className="text-muted-foreground">{note}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function ChangelogRoute() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <Navbar />
      <main className="flex-1">
        <section className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <header className="mb-12 text-center">
              <h1 className="mb-4 text-4xl font-bold md:text-5xl">What&apos;s Changed</h1>
              <p className="text-xl text-muted-foreground">A running record of what has changed in FolderPls</p>
            </header>

            <div className="space-y-8">
              {RELEASES.map((release) => (
                <ReleaseEntry key={release.version} release={release} />
              ))}

              <p className="rounded-xl border border-dashed border-border/50 bg-card/30 p-8 text-center text-muted-foreground">
                New releases are listed here as they ship.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
