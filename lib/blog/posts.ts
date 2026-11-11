/**
 * Blog posts (static, English — the indexable language of the site).
 *
 * Writing rules: every claim about Google or a competitor carries a footnote
 * `[^source-id]` pointing at a page that was read on `accessed`. Be fair to
 * competitors: say where they are the better choice. Inline links use
 * `[text](/path)`. tests/unit/blog-posts.test.ts enforces the structure.
 */

import { GUIDE_POSTS } from "./guides";

export interface BlogSource {
  id: string;
  title: string;
  url: string;
  /** ISO date the page was read. */
  accessed: string;
}

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; id: string; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; caption: string; head: string[]; rows: string[][] }
  | { type: "callout"; text: string }
  /** Metin diyagramı (ağaç gösterimi); ekran görüntüsü yerine. */
  | { type: "pre"; text: string };

export interface BlogPost {
  slug: string;
  /** Yazının başlığı (sayfadaki h1, listeler). */
  title: string;
  /** Yazının kısa özeti (listeler, JSON-LD). */
  description: string;
  /**
   * <title> ve sosyal kart başlığı, MUTLAK: kök şablon ("… | FolderPls") eklenmez, en çok 60 karakter
   * (lib/seo/page-meta.ts MAX_TITLE). Şablonun 12 karakteri hedef sorguyu ("Google Drive …") başlıktan
   * kovmasın diye blog yazıları şablonsuz kendi başlığını taşır. Verilmezse `title` + şablon.
   */
  seoTitle?: string;
  /** Arama sonucu açıklaması (en çok 160 karakter). Verilmezse `description`. */
  seoDescription?: string;
  /** ISO publish date. */
  date: string;
  /** ISO date of the last substantive content change (JSON-LD dateModified). Defaults to `date`. */
  updated?: string;
  readingMinutes: number;
  tags: string[];
  blocks: BlogBlock[];
  /** Düz metin SSS: sayfada görünür ve FAQPage JSON-LD olarak yazılır (görünen metinle birebir aynı). */
  faq?: { q: string; a: string }[];
  sources: BlogSource[];
}

const ACCESSED = "2026-09-27";

const SOURCE_EDITIONS: BlogSource = {
  id: "editions",
  title: "Google Workspace Admin Help — Get started as a classification labels admin",
  url: "https://knowledge.workspace.google.com/admin/security/get-started-as-a-classification-labels-admin",
  accessed: ACCESSED,
};

const SOURCE_APPLY: BlogSource = {
  id: "apply",
  title: "Google Drive Help — Apply labels to files in Google Drive",
  url: "https://support.google.com/drive/answer/13495216",
  accessed: ACCESSED,
};

// 14 Eki 2026'da yeniden okundu (karşılaştırma yazısı ve Drive Labels'a dayanan iki eski yazı): sürüm listesi
// (sayfada "Last updated 2026-10-09 UTC"), Drive Help "up to 150 labels to each file" ama Admin Help "up to 150
// labels for your organization" + "Files can have any number of classification labels", "Only administrators can
// create labels", etiketle dosya araması, mobilde uygulama/değiştirme yok, bir seferde 100 dosya.
const ACCESSED_OCT_14 = "2026-10-14";

const SOURCE_EDITIONS_OCT: BlogSource = { ...SOURCE_EDITIONS, accessed: ACCESSED_OCT_14 };
const SOURCE_APPLY_OCT: BlogSource = { ...SOURCE_APPLY, accessed: ACCESSED_OCT_14 };

const SOURCE_ORGANIZE: BlogSource = {
  id: "organize",
  title: "Google Workspace Updates: Organize My Files in Drive now generally available",
  url: "https://workspaceupdates.googleblog.com/2026/06/organize-my-files-in-drive-now-generally-available.html",
  // Yazı tarihi 1 Haz 2026; 14 Eki 2026'da okundu.
  accessed: ACCESSED_OCT_14,
};

const CORE_POSTS: BlogPost[] = [
  {
    slug: "google-drive-labels-limits",
    title: "Google Drive Labels: who can use them, and the limits to know",
    seoTitle: "Google Drive Labels: who can use them, and the limits",
    seoDescription:
      "Drive Labels exist only on some Workspace editions, only admins create them, and the mobile app can't apply them. What to do instead.",
    description:
      "Drive Labels exist only on some Google Workspace editions, only admins can create them, and you can't apply them in the Drive mobile app. What that means, and what to do instead.",
    date: "2026-09-27",
    updated: "2026-10-14",
    readingMinutes: 6,
    tags: ["Google Drive", "Drive Labels", "Google Workspace"],
    blocks: [
      {
        type: "p",
        text: "Google Drive Labels (Google also calls them classification labels) let an organization attach structured metadata to files: a status, a contract type, a sensitivity level. They are genuinely useful. They are also the reason many people searching for \"tags in Google Drive\" end up confused, because the feature simply isn't there for them. This guide covers who can use Drive Labels, the limits that matter day to day, and the options when they're not available.",
      },
      { type: "h2", id: "what-they-are", text: "What Drive Labels are" },
      {
        type: "p",
        text: "An administrator creates labels, optionally with fields such as \"Contract status\" or \"Due date\". People in the organization then apply those labels to files.[^apply] Users who can see a label and have access to a file can search Drive by labels or fields.[^editions] In editions that support data loss prevention (DLP), admins can also apply labels automatically and use them in rules, for example to block external sharing of files labeled \"Confidential\".[^editions]",
      },
      { type: "h2", id: "who-can-use-them", text: "Who can use them" },
      {
        type: "p",
        text: "Google lists the supported editions as Frontline Starter, Standard and Plus; Business Standard and Business Plus; Enterprise Standard and Enterprise Plus; Education Standard and Education Plus; Essentials, Enterprise Essentials and Enterprise Essentials Plus; and G Suite Business.[^editions]",
      },
      {
        type: "ul",
        items: [
          "Personal Google accounts (@gmail.com) are not a Workspace edition, so they don't get Drive Labels.",
          "Google Workspace Business Starter is not on the list either.",
        ],
      },
      {
        type: "p",
        text: "Not sure where your account stands? The [Drive Labels checker](/drive-labels-checker) walks through Google's list in two clicks, without signing in to anything.",
      },
      { type: "h2", id: "limits", text: "The limits that matter day to day" },
      {
        type: "ul",
        items: [
          "Only administrators can create labels.[^apply] A freelancer, or a small team without an admin, can't define their own.",
          "You can view labels in the Drive mobile app, but you can't apply or change them there.[^apply]",
          "Drive Help says a file can carry up to 150 labels.[^apply] The admin documentation says an organization can create up to 150 labels and that a file can carry any number.[^editions] Google's two pages word the limit differently, so check the current wording before you plan around a number.",
          "On a computer you can apply a label to up to 100 files at once from Drive.[^apply]",
          "Labels can't be applied to folders, shortcuts, shared drives, or files owned by another organization.[^editions]",
          "To apply a label you need edit access to the file and the admin must have given you access to that label.[^apply]",
        ],
      },
      {
        type: "callout",
        text: "Checked on 14 October 2026 against Google's own help pages. Google changes Workspace features often, so follow the sources below for the current state.",
      },
      { type: "h2", id: "when-labels-win", text: "When Drive Labels are the right choice" },
      {
        type: "p",
        text: "If your organization already pays for an eligible edition and wants one taxonomy for everyone, managed centrally, Drive Labels are hard to beat. They live inside Drive, show up in Drive search, and plug into admin policies like DLP.[^editions] No third-party tool can match that level of integration.",
      },
      { type: "h2", id: "alternatives", text: "What to do if you can't use them" },
      {
        type: "ol",
        items: [
          "Naming conventions — e.g. `2026-Q1_acme_brief_APPROVED.pdf`. Free and searchable, but brittle: one rename and the \"tag\" is gone.",
          "Folder colors and stars — quick visual cues built into Drive, but a file is either starred or not, and colors only apply to folders.",
          "Shortcuts — Drive's \"Add shortcut\" lets one file appear in several folders, which gets you part of the way to multiple categories.",
          "A tagging layer on top of Drive — tools like [FolderPls](/) let you create your own tags, filter by them and open the file in Drive, without moving it. It works on personal Google accounts. The trade-off: the tags live in your browser, so Drive's own search doesn't see them.",
        ],
      },
      {
        type: "p",
        text: "For a step-by-step on the personal-account case, see [how to tag Google Drive files on a personal Gmail account](/blog/tag-google-drive-files-personal-gmail). For a side-by-side, see [FolderPls vs Google Drive Labels](/blog/folderpls-vs-google-drive-labels).",
      },
    ],
    sources: [SOURCE_EDITIONS_OCT, SOURCE_APPLY_OCT],
  },
  {
    slug: "tag-google-drive-files-personal-gmail",
    title: "How to tag Google Drive files on a personal Gmail account",
    seoTitle: "How to tag Google Drive files on a personal Gmail account",
    seoDescription:
      "Drive's built-in labels aren't available on personal Google accounts. Four ways to organize files by topic, status or client anyway.",
    description:
      "Drive's built-in labels aren't available on personal Google accounts. Four ways to organize files by topic, status or client anyway, including a tagging layer that never moves your files.",
    date: "2026-09-27",
    updated: "2026-10-14",
    readingMinutes: 5,
    tags: ["Google Drive", "Personal Gmail", "File organization"],
    blocks: [
      {
        type: "p",
        text: "If you use Google Drive with a personal @gmail.com account, you may have noticed there is no \"Labels\" option on your files. That's expected: Drive Labels are a Google Workspace feature, available only on certain editions,[^editions] and even there only administrators can create them.[^apply] Here are four ways to get tag-like organization anyway, from zero-setup to purpose-built.",
      },
      { type: "h2", id: "naming", text: "1. Use a naming convention" },
      {
        type: "p",
        text: "Put the \"tags\" in the file name: `client_project_status_date`. Drive search finds them, and it costs nothing. It breaks down when names get long, when people forget the pattern, or when a file belongs to two projects.",
      },
      { type: "h2", id: "colors-stars", text: "2. Folder colors and stars" },
      {
        type: "p",
        text: "Drive lets you color folders and star files. It's fast and visual, but it gives you one yes/no flag per file and a handful of colors for folders — not a vocabulary you can filter by.",
      },
      { type: "h2", id: "shortcuts", text: "3. Shortcuts to put one file in several places" },
      {
        type: "p",
        text: "With Drive's \"Add shortcut\", the same file can appear in a \"Client A\" folder and in a \"Q1 campaign\" folder. That covers the \"one file, two categories\" problem, but every new category is another folder to maintain.",
      },
      { type: "h2", id: "tagging-layer", text: "4. Add a tagging layer on top of Drive" },
      {
        type: "p",
        text: "A tagging layer keeps files where they are in Drive and stores the tags separately. [FolderPls](/) works this way and is free:",
      },
      {
        type: "ol",
        items: [
          "Open FolderPls and connect Google Drive with your Google account.",
          "Choose files with Google's file picker. FolderPls only gets access to the files you choose (and files you create through it), not your whole Drive.",
          "Create your own tags — \"Client · Acme\", \"Approved\", \"Q1 campaign\" — and apply as many as you like. You can give a tag an expiry date so it removes itself.",
          "Filter by one or more tags, then open the original file in Drive with one click.",
        ],
      },
      {
        type: "p",
        text: "Be clear about the trade-off: the tags live in your browser, not inside Drive, so Drive's own search won't find them, and another device only sees them after it connects to your Drive backup or imports a JSON file. And while FolderPls runs in a phone's browser, its layout is built for desktop first.",
      },
      { type: "h2", id: "compare", text: "Which option fits?" },
      {
        type: "table",
        caption: "Ways to tag Drive files on a personal Google account",
        head: ["Option", "Setup", "One file, many categories", "Visible in Drive search"],
        rows: [
          ["Naming convention", "None", "Awkward", "Yes"],
          ["Folder colors / stars", "None", "No", "Stars: yes"],
          ["Shortcuts", "Low", "Yes (one folder per category)", "Yes"],
          ["Tagging layer (e.g. FolderPls)", "Connect Drive", "Yes", "No — filter in FolderPls"],
        ],
      },
      {
        type: "p",
        text: "If you later move to a Workspace edition that includes Drive Labels, read [what Drive Labels can and can't do](/blog/google-drive-labels-limits) before choosing. Not sure whether your account has them? Try the [Drive Labels checker](/drive-labels-checker).",
      },
    ],
    sources: [SOURCE_EDITIONS_OCT, SOURCE_APPLY_OCT],
  },
  {
    slug: "folderpls-vs-google-drive-labels",
    title: "FolderPls vs Google Drive Labels: an honest comparison",
    seoTitle: "FolderPls vs Google Drive Labels: an honest comparison",
    seoDescription:
      "Drive Labels need an eligible Workspace edition and an admin. FolderPls is a Drive Labels alternative for personal accounts. Side by side, with sources.",
    description:
      "Drive Labels need an eligible Workspace edition and an admin. FolderPls works on personal Google accounts too. A side-by-side comparison, with sources and where Drive Labels win.",
    date: "2026-10-14",
    readingMinutes: 5,
    tags: ["Comparison", "Google Drive", "Drive Labels"],
    blocks: [
      {
        type: "p",
        text: "Short version: if your organization pays for an eligible Google Workspace edition and an admin is willing to set labels up, use Drive Labels. They live inside Drive, show up in Drive search and can drive admin policies. If you're on a personal Google account, on Business Starter, or have no admin to create labels, Drive Labels aren't an option. That is where FolderPls fits: a Drive Labels alternative for people who can't use them. Not sure which side you're on? Run the [Drive Labels checker](/drive-labels-checker).",
      },
      { type: "h2", id: "what-each-is", text: "What each one is" },
      {
        type: "p",
        text: "Drive Labels are metadata that an administrator defines and people in the organization apply to files in Drive. Google says a label can be as simple as a tag, or carry structured fields such as selections, dates, numbers or people.[^editions] People who can see a label and have access to a file can then search Drive by it.[^editions]",
      },
      {
        type: "p",
        text: "FolderPls is a tagging layer for Google Drive. You pick files with Google's file picker, add your own tags (optionally with an end date), filter by them, see how files and tags connect in a graph view, and open the original file in Drive. The tags are stored in your browser, not in Drive. It's free for any Google account that can use Drive, with no paid plans (see [pricing](/pricing)). You can also try it on made-up files in the [demo with sample data](/demo), without connecting Drive.",
      },
      { type: "h2", id: "side-by-side", text: "Side by side" },
      {
        type: "table",
        caption: "Google Drive Labels and FolderPls compared",
        head: ["Aspect", "Google Drive Labels", "FolderPls"],
        rows: [
          [
            "Who can use it",
            "Workspace organizations on an edition Google lists, such as Business Standard, Business Plus and Enterprise Standard. Not Business Starter, and not personal Google accounts.[^editions]",
            "Any Google account that can use Drive. It's free.",
          ],
          [
            "Who creates the tags",
            "Administrators only. People apply the labels an admin has shared with them, and need edit access to the file.[^apply]",
            "You do, with your own names and colors.",
          ],
          [
            "Where the tags live",
            "Inside Drive, so Drive search can filter by them.[^editions]",
            "In your browser. Drive's own search can't see them: you filter in FolderPls, then open the file in Drive. Another device only sees them after it connects to your Drive backup or imports a JSON file.",
          ],
          [
            "Which files",
            "Any file in Drive owned by your organization, but not folders, shortcuts, shared drives or files owned by another organization.[^editions]",
            "The files you pick with Google's file picker, plus files you create through FolderPls. It can't see the rest of your Drive.",
          ],
          [
            "Policies and compliance",
            "A label can be a condition or action in Data Loss Prevention (DLP) rules, for example to block external sharing.[^editions]",
            "None. FolderPls helps you organize and find files; it doesn't enforce policies.",
          ],
          [
            "On a phone",
            "View only in the Drive mobile app. You can't apply or change labels there.[^apply]",
            "Runs in a phone's browser. There is no native app, and the layout is built for a desktop first.",
          ],
          [
            "Label limits",
            "Drive Help says up to 150 labels per file.[^apply] The admin documentation says an organization can create up to 150 labels and that a file can carry any number.[^editions]",
            "No fixed per-file limit.",
          ],
          [
            "Moving files",
            "Labels are metadata on the file, so it stays where it is.[^editions]",
            "Tagging never moves a file. FolderPls can also copy, move, rename and delete files, but only when you choose to.",
          ],
        ],
      },
      {
        type: "callout",
        text: "Google's two pages disagree on the 150 limit, so check the current wording before you plan around it. Everything in the Google column comes from the sources below, read on 14 October 2026.",
      },
      { type: "h2", id: "choose-drive-labels", text: "Choose Drive Labels if…" },
      {
        type: "ul",
        items: [
          "your organization is on an eligible edition and an admin owns the label taxonomy,",
          "you want labels to work in Drive search and in admin policies such as DLP,[^editions]",
          "you need one shared vocabulary for everyone, managed centrally,",
          "and you mostly work on a computer, since labels can't be applied in the mobile app.[^apply]",
        ],
      },
      { type: "h2", id: "choose-folderpls", text: "Choose FolderPls if…" },
      {
        type: "ul",
        items: [
          "you're on a personal Google account or on Business Starter, where Drive Labels aren't offered,",
          "you want to create your own tags without waiting for an admin,",
          "you're fine with the tags living in your browser instead of inside Drive, and with a desktop-first layout,",
          "and you'd like tags with an end date, or a graph of how your tagged files connect.",
        ],
      },
      { type: "h2", id: "organize-my-files", text: "What about Google's Organize My Files?" },
      {
        type: "p",
        text: "Google also offers Organize My Files, a different kind of tool. Gemini suggests where loose files could move, and once you approve the suggestions it moves them into folders.[^organize] That solves a folder problem rather than a tagging problem: each file still ends up in one folder. Google lists it for Business Standard and Plus, Enterprise Standard and Plus, and certain paid consumer plans, and says it is available in English.[^organize] FolderPls goes the other way: files stay where they are and the structure lives in tags.",
      },
      { type: "h2", id: "not-sure", text: "Not sure what your account has?" },
      {
        type: "p",
        text: "The [Drive Labels checker](/drive-labels-checker) follows Google's list of supported editions and runs in your browser. It doesn't sign in to Google or read your Drive. For the personal-account case in more detail, see [how to tag Google Drive files on a personal Gmail account](/blog/tag-google-drive-files-personal-gmail) and [Drive Labels: who can use them, and the limits](/blog/google-drive-labels-limits).",
      },
      {
        type: "callout",
        text: "Google details come from its own help pages, read on 14 October 2026. Google changes Workspace editions and features often, so follow the sources before you decide.",
      },
    ],
    sources: [SOURCE_EDITIONS_OCT, SOURCE_APPLY_OCT, SOURCE_ORGANIZE],
  },
];

/** Çekirdek yazılar önce (blog dizininde ilki öne çıkar), sonra arama niyetli rehberler (guides.ts). */
export const BLOG_POSTS: BlogPost[] = [...CORE_POSTS, ...GUIDE_POSTS];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export type InlineToken =
  | { kind: "text"; value: string }
  | { kind: "code"; value: string }
  | { kind: "link"; text: string; href: string }
  | { kind: "footnote"; sourceId: string };

/** Tiny inline parser: `[text](href)`, `[^source-id]` and `code`. */
export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /\[\^([a-z0-9-]+)\]|\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ kind: "text", value: text.slice(last, index) });
    if (match[1]) tokens.push({ kind: "footnote", sourceId: match[1] });
    else if (match[2] && match[3]) tokens.push({ kind: "link", text: match[2], href: match[3] });
    else if (match[4]) tokens.push({ kind: "code", value: match[4] });
    last = index + match[0].length;
  }
  if (last < text.length) tokens.push({ kind: "text", value: text.slice(last) });
  return tokens;
}
