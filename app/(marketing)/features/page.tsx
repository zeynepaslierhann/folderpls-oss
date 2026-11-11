import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { TagIcon, SearchIcon, GridViewIcon, FolderIcon, DocumentIcon, ImageIcon } from "@/components/icons";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants/site";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/og";
import { PAGE_META } from "@/lib/seo/page-meta";

const siteUrl = SITE_URL;

export const metadata: Metadata = {
  title: PAGE_META.features.title,
  description: PAGE_META.features.description,
  keywords: [
    "Google Drive features",
    "file organization features",
    "metadata tagging",
    "file search features",
    "Drive file management",
    "file labeling system",
    "cloud storage features"
  ],
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: PAGE_META.features.ogTitle,
    description: PAGE_META.features.ogDescription,
    url: `${siteUrl}/features`,
  },
  alternates: {
    canonical: `${siteUrl}/features`,
  },
};

interface Capability {
  icon: typeof TagIcon;
  title: string;
  summary: string;
  points: string[];
}

const CAPABILITIES: Capability[] = [
  {
    icon: TagIcon,
    title: "Labels You Define",
    summary:
      "Put your own labels on files and folders while they stay right where they are in Google Drive. Use as many labels per file as you need.",
    points: [
      "Create your own custom labels with custom colors",
      "Put several labels on the same file or folder",
      "Rename a label or recolor it whenever you like",
      "A label edit shows up on every item that carries it",
    ],
  },
  {
    icon: SearchIcon,
    title: "Fast Search",
    summary:
      "Find files by name or label. Search covers the files and folders you have picked in FolderPls and shows results organized by type.",
    points: [
      "Look up a file, a folder or a label by its name",
      "Results update as you type",
      "Matches grouped into folders, labels and files",
      "A few letters are enough, full names aren't needed",
    ],
  },
  {
    icon: GridViewIcon,
    title: "List or Grid, Your Call",
    summary:
      "Browse your files as a list or as a grid, whichever suits you. Both views support labeling and search.",
    points: [
      "List layout when you want the file details",
      "Grid layout when you'd rather scan by eye",
      "Flip between the two at any time",
    ],
  },
  {
    icon: FolderIcon,
    title: "Labels Never Touch Your Files",
    summary:
      "Labels live in your browser, not in your Drive: tagging a file never moves, renames or changes it. If you also want to tidy up, optional file actions are in the right-click menu for the files you picked.",
    points: [
      "Your files stay in their Drive folders when you label them",
      "Optional file actions (copy, move, rename) in the right-click menu",
      "Delete only with confirmation",
      "Actions apply to the files you picked in FolderPls",
    ],
  },
  {
    icon: ImageIcon,
    title: "Preview Without Leaving",
    summary:
      "Images and videos open right inside FolderPls. For documents and PDFs, open them in Google Drive.",
    points: [
      "Sharp thumbnails when you preview an image",
      "Videos play through Google Drive's player",
      "Docs, Sheets and Slides are a link away",
      "PDFs open in Google Drive's viewer",
    ],
  },
  {
    icon: DocumentIcon,
    title: "Back and Forward Just Work",
    summary:
      "Your browser's back and forward buttons step through your folders. Your folder location is saved in the page address, so bookmarks and reloads return you to the same place.",
    points: [
      "Step between folders with back and forward",
      "Reload a page and land back in the same folder",
      "Save a folder's address as a bookmark",
    ],
  },
];

function CapabilityCard({ icon: Icon, title, summary, points }: Capability) {
  return (
    <section className="flex items-start gap-4 rounded-xl border border-border/50 bg-card/50 p-8">
      <div className="rounded-lg bg-brand-ocean/10 p-3">
        <Icon className="w-6 h-6 text-brand-ocean-ink" />
      </div>
      <div>
        <h2 className="mb-3 text-2xl font-bold">{title}</h2>
        <p className="mb-4 text-muted-foreground">{summary}</p>
        <ul className="space-y-2 text-muted-foreground">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2">
              <span className="mt-1 text-brand-ocean-ink">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function FeaturesRoute() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <Navbar />
      <main className="flex-1">
        <section className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <header className="mb-12 text-center">
              <h1 className="mb-4 text-4xl font-bold md:text-5xl">What FolderPls Does</h1>
              <p className="text-xl text-muted-foreground">
                Organize your Google Drive files without moving them
              </p>
            </header>

            <div className="space-y-12">
              {CAPABILITIES.map((capability) => (
                <CapabilityCard key={capability.title} {...capability} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
