/**
 * Arama niyeti yüksek ABD rehberleri (16 Eki 2026, SEO/edinim turu).
 *
 * Kurallar (posts.ts ile aynı): Google özellikleri YALNIZ Google'ın resmi yardım sayfasından, yazıdaki
 * tarihte okunarak yazılır ve dipnotla bağlanır. FolderPls iddiaları yalnız urun-gercegi.md'de doğrulananlarla
 * sınırlıdır: etiketler tarayıcıda durur (Drive'da değil), yalnız seçilen dosyalar görülür (drive.file),
 * ürün ücretsizdir, "AI" sözü ve "klasör seç" anlatımı yoktur (claim-scan.test.ts).
 */
import type { BlogPost, BlogSource } from "./posts";

const READ = "2026-10-16";

const SRC_ORGANIZE_HELP: BlogSource = {
  id: "organize-help",
  title: "Google Drive Help: Organize your files in Google Drive",
  url: "https://support.google.com/drive/answer/2375091",
  accessed: READ,
};

const SRC_SEARCH_HELP: BlogSource = {
  id: "search-help",
  title: "Google Drive Help: Search for files in Google Drive",
  url: "https://support.google.com/drive/answer/2375114",
  accessed: READ,
};

const SRC_LABELS_APPLY: BlogSource = {
  id: "apply",
  title: "Google Drive Help: Apply labels to files in Google Drive",
  url: "https://support.google.com/drive/answer/13495216",
  accessed: READ,
};

const SRC_LABELS_EDITIONS: BlogSource = {
  id: "editions",
  title: "Google Workspace Admin Help: Get started as a classification labels admin",
  url: "https://knowledge.workspace.google.com/admin/security/get-started-as-a-classification-labels-admin",
  accessed: READ,
};

const SRC_SHARED_DRIVES: BlogSource = {
  id: "shared-drives",
  title: "Google Workspace Learning Center: What you can do with shared drives",
  url: "https://support.google.com/a/users/answer/9310351",
  accessed: READ,
};

const DATE = "2026-10-16";

export const GUIDE_POSTS: BlogPost[] = [
  {
    slug: "how-to-tag-files-in-google-drive",
    title: "How to tag files in Google Drive: every option, step by step",
    seoTitle: "How to Tag Files in Google Drive: 5 Ways, Step by Step",
    seoDescription:
      "Google Drive has no tag button on most accounts. Five working ways to tag files: names, stars, folder colors, shortcuts, Drive Labels and a tagging layer.",
    description:
      "Google Drive has no tag button on most accounts. Here are the ways that work, from file names and stars to Drive Labels and a tagging layer, with the exact steps for each.",
    date: DATE,
    readingMinutes: 7,
    tags: ["Google Drive", "Tagging", "How-to"],
    blocks: [
      {
        type: "p",
        text: "If you searched \"how to tag files in Google Drive\", you probably looked for a tag button and did not find one. That is normal. Drive's own labeling feature, Drive Labels, is limited to certain Google Workspace editions and only administrators can create labels.[^editions][^apply] Everyone else has to work with what Drive's help pages call organizing tips: naming conventions, folder colors, stars, descriptions and shortcuts.[^organize-help] This guide walks through each option, then shows where a separate tagging layer fits.",
      },
      { type: "h2", id: "quick-answer", text: "The short answer" },
      {
        type: "ul",
        items: [
          "Personal Gmail account: use file names, stars, shortcuts, or a tagging layer such as FolderPls. Drive Labels are not available.",
          "Workspace edition with Drive Labels: ask your admin to create the labels, then apply them from the file's details panel.",
          "Business Starter or no admin: same as a personal account.",
        ],
      },
      { type: "p", text: "Not sure which group you are in? The [Drive Labels checker](/drive-labels-checker) follows Google's edition list in two clicks." },
      { type: "h2", id: "names", text: "1. Put the tags in the file name" },
      {
        type: "p",
        text: "Drive's help suggests a naming convention with short, meaningful names that can include dates, keywords or numbers.[^organize-help] Turn that into a tag system by fixing the order of the parts, for example `Client_Project_Status_2026-10`.",
      },
      {
        type: "ol",
        items: [
          "Decide the parts and their order (client, project, status, date).",
          "Right-click a file in Drive and choose Rename, then type the new name.",
          "Search for any part, such as \"Approved\", in the Drive search bar.",
        ],
      },
      { type: "p", text: "Strength: zero setup and it shows up in Drive search. Weakness: renaming changes the name other people see, and a file that belongs to two projects can only carry one name." },
      { type: "h2", id: "stars-colors", text: "2. Stars and folder colors" },
      {
        type: "p",
        text: "To star an item, right-click it and choose Organize, then Add to starred. To color a folder, right-click it, choose Organize and pick a color under Folder color. Google notes that folder colors apply only to your own version of Drive.[^organize-help] Stars give you one yes-or-no flag, and colors are per folder, so neither is a real tag vocabulary.",
      },
      { type: "h2", id: "shortcuts", text: "3. Shortcuts: one file, several places" },
      {
        type: "p",
        text: "A shortcut is a link that references another file or folder.[^organize-help] To make one, right-click the item, choose Organize, then Add shortcut, and pick the folder where it should appear. Deleting a shortcut does not delete the original file.[^organize-help] This solves \"one file, two categories\" at the price of one folder per category.",
      },
      { type: "h2", id: "descriptions", text: "4. Descriptions as notes" },
      {
        type: "p",
        text: "Drive now lets you add rich text descriptions to files and folders: select the item, open Details in the side panel and edit the description.[^organize-help] A description is good for context (\"final version sent to the client\"). It is a note, not a filterable tag.",
      },
      { type: "h2", id: "drive-labels", text: "5. Drive Labels, if your edition has them" },
      {
        type: "p",
        text: "Drive Labels attach structured metadata to files. An administrator creates the labels, and people with access to a label can apply it to files they can edit.[^apply] Google lists the supported editions in its admin documentation, and personal accounts and Business Starter are not on that list.[^editions] Details and limits are in [Drive Labels: who can use them](/blog/google-drive-labels-limits).",
      },
      { type: "h2", id: "tagging-layer", text: "6. A tagging layer on top of Drive" },
      {
        type: "p",
        text: "If you want your own multi-tag vocabulary without an admin, a separate tagging layer keeps files where they are and stores the tags on its side. This is how [FolderPls](/) works:",
      },
      {
        type: "ol",
        items: [
          "[Open FolderPls](/dashboard), connect Google Drive and allow access on Google's screen.",
          "Choose the files you want to organize with Google's file picker. FolderPls can only see the files you pick, because it asks Google for the narrow drive.file permission.",
          "Create tags such as \"Client · Acme\", \"Approved\" or \"2026 taxes\" and apply as many as you like to each file. You can color tags, add a note, or give a tag an end date.",
          "Filter by tags, or type a query such as `label:approved` into the search box, then open the original file in Drive.",
        ],
      },
      {
        type: "callout",
        text: "The trade-off: tags live in your browser, not inside Drive, so Drive's own search will not find them. FolderPls is desktop-first, and it is free.",
      },
      {
        type: "table",
        caption: "Ways to tag Google Drive files",
        head: ["Method", "Several tags per file", "Works on personal Gmail", "Found by Drive search"],
        rows: [
          ["File names", "Awkward", "Yes", "Yes"],
          ["Stars", "No (one flag)", "Yes", "Yes (is:starred)"],
          ["Folder colors", "No", "Yes", "No"],
          ["Shortcuts", "Yes, one folder per tag", "Yes", "Yes"],
          ["Drive Labels", "Yes", "No", "Yes"],
          ["Tagging layer (FolderPls)", "Yes", "Yes", "No, filter in the app"],
        ],
      },
      { type: "p", text: "Next: compare the options in [Google Drive Labels alternatives](/blog/google-drive-labels-alternative), or learn to [organize Google Drive files by tags](/blog/organize-google-drive-files-by-tags)." },
    ],
    faq: [
      {
        q: "Can you tag files in Google Drive?",
        a: "Not on every account. Drive Labels exist only on certain Google Workspace editions and only administrators can create them. On a personal Gmail account you can use file names, stars, folder colors and shortcuts, or a separate tagging tool.",
      },
      {
        q: "How do I add tags to Google Drive files on a personal account?",
        a: "Drive Labels are not offered on personal accounts, so use a naming convention, stars and shortcuts, or a tagging layer such as FolderPls that stores tags outside Drive and leaves your files where they are.",
      },
      {
        q: "Does tagging a file in FolderPls move it in Drive?",
        a: "No. Tagging does not move or rename the file. The tags are stored in your browser, so Drive's own search does not see them.",
      },
    ],
    sources: [SRC_ORGANIZE_HELP, SRC_LABELS_APPLY, SRC_LABELS_EDITIONS],
  },
  {
    slug: "google-drive-labels-alternative",
    title: "Google Drive Labels alternatives: five options if you cannot use them",
    seoTitle: "Google Drive Labels Alternative: 5 Options Compared",
    seoDescription:
      "Drive Labels need a supported Workspace edition and an admin. Five alternatives for people who have neither, with an honest note on what each cannot do.",
    description:
      "Drive Labels need a supported Workspace edition and an admin. Here are five alternatives for people who have neither, with an honest note on what each one cannot do.",
    date: DATE,
    readingMinutes: 6,
    tags: ["Drive Labels", "Alternatives", "Google Workspace"],
    blocks: [
      {
        type: "p",
        text: "Drive Labels are a good feature with a narrow audience. Google lists the Workspace editions that support them, and personal accounts and Business Starter are not among them.[^editions] Even where they exist, only administrators can create labels.[^apply] If that rules you out, or if the setup is more process than you want, here are five alternatives.",
      },
      { type: "h2", id: "when-labels-fit", text: "When Drive Labels are still the right choice" },
      {
        type: "p",
        text: "If your organization is on a supported edition and an admin maintains the label list, use them. Labels are searchable in Drive, and in editions with data loss prevention admins can build rules on them.[^editions] No outside tool matches that integration. Everything below is for the cases where it does not apply.",
      },
      { type: "h2", id: "option-1", text: "1. A strict naming convention" },
      { type: "p", text: "Put status, client and date in the file name in a fixed order. It costs nothing and Drive search finds it,[^search-help] but one file can only have one name." },
      { type: "h2", id: "option-2", text: "2. Shortcuts as categories" },
      { type: "p", text: "Create one folder per category and add shortcuts to the same file in each. A shortcut references the original file and removing it does not delete the file.[^organize-help] It works, but every new category is another folder to keep tidy." },
      { type: "h2", id: "option-3", text: "3. Shared drives plus a folder convention" },
      { type: "p", text: "For teams on Workspace, shared drives keep files owned by the team instead of an individual, so files stay in place when a member leaves.[^shared-drives] They solve ownership, not tagging, so pair them with a naming convention." },
      { type: "h2", id: "option-4", text: "4. A spreadsheet index" },
      { type: "p", text: "A Google Sheet with one row per file, a link column and tag columns gives full control and filters. The cost is manual upkeep: the sheet drifts as soon as someone forgets to update it." },
      { type: "h2", id: "option-5", text: "5. A tagging layer such as FolderPls" },
      {
        type: "p",
        text: "[FolderPls](/) keeps your files where they are and lets you apply your own tags to the files you choose with Google's picker. You can use several tags per file, color them, add notes, set an end date on a tag, save filters and search with `label:` queries. The limits: tags are stored in your browser rather than in Drive, so Drive search cannot see them, and the layout is desktop-first. FolderPls is free, with no paid plans. For a side-by-side with Drive Labels, read [FolderPls vs Google Drive Labels](/blog/folderpls-vs-google-drive-labels).",
      },
      {
        type: "table",
        caption: "Alternatives to Drive Labels",
        head: ["Option", "Needs admin", "Several tags per file", "Visible in Drive search"],
        rows: [
          ["Naming convention", "No", "Awkward", "Yes"],
          ["Shortcuts", "No", "Yes, one folder per tag", "Yes"],
          ["Shared drives + convention", "Admin creates shared drives", "Awkward", "Yes"],
          ["Spreadsheet index", "No", "Yes", "No"],
          ["Tagging layer (FolderPls)", "No", "Yes", "No"],
        ],
      },
      { type: "p", text: "New to all of this? Start with [how to tag files in Google Drive](/blog/how-to-tag-files-in-google-drive)." },
    ],
    faq: [
      {
        q: "What is an alternative to Google Drive Labels?",
        a: "Common alternatives are a fixed naming convention, shortcuts used as categories, a spreadsheet index, or a tagging tool such as FolderPls that stores tags outside Drive.",
      },
      {
        q: "Why can't I see Drive Labels in my account?",
        a: "Google lists specific Workspace editions that support Drive Labels, and personal Gmail accounts and Business Starter are not on the list. Even on a supported edition, an administrator has to create the labels first.",
      },
      {
        q: "Will Drive search find tags I add in FolderPls?",
        a: "No. FolderPls keeps tags in your browser, so you filter and search inside FolderPls and then open the file in Drive.",
      },
    ],
    sources: [SRC_LABELS_EDITIONS, SRC_LABELS_APPLY, SRC_ORGANIZE_HELP, SRC_SEARCH_HELP, SRC_SHARED_DRIVES],
  },
  {
    slug: "organize-google-drive-files-by-tags",
    title: "How to organize Google Drive files by tags without moving them",
    seoTitle: "Organize Google Drive Files by Tags (Without Moving)",
    seoDescription:
      "Design a tag system for Google Drive in four steps: pick tag groups, set naming rules, tag what you use, and review monthly. No file moves needed.",
    description:
      "A four-step method to organize Google Drive files by tags: pick a few tag groups, set naming rules, tag the files you actually use, and review monthly. Files stay where they are.",
    date: DATE,
    readingMinutes: 6,
    tags: ["Google Drive", "Tags", "File organization"],
    blocks: [
      {
        type: "p",
        text: "Folders force every file into one place. Tags let a file belong to a client, a status and a year at the same time. Drive's own help says there is no correct way to organize files and recommends a simple structure that you adjust as you go.[^organize-help] The method below applies that advice to tags, and it works whether you use Drive Labels, file names or a tool like FolderPls.",
      },
      { type: "h2", id: "step-1", text: "Step 1: choose three tag groups" },
      {
        type: "p",
        text: "Most people need only three groups. More groups make tagging a chore and the vocabulary decays.",
      },
      {
        type: "table",
        caption: "A starter tag vocabulary",
        head: ["Group", "Question it answers", "Example tags"],
        rows: [
          ["Who", "Whose is this?", "Client · Acme, Client · Birch, Internal"],
          ["State", "Where is it in the process?", "Draft, In review, Approved, Archive"],
          ["When", "Which period?", "2025, 2026, Q4"],
        ],
      },
      { type: "h2", id: "step-2", text: "Step 2: write the naming rules down" },
      {
        type: "ul",
        items: [
          "Singular, short, and one spelling (\"Approved\", not \"approved\" and \"Final OK\").",
          "A prefix for the group, such as \"Client · \", so tags sort together.",
          "Use years, not relative words like \"recent\".",
        ],
      },
      { type: "h2", id: "step-3", text: "Step 3: tag what you actually use" },
      {
        type: "p",
        text: "Do not try to tag a whole Drive in one weekend. Tag files as you touch them and the system grows where you work. With FolderPls, [open the app](/dashboard), choose files with the Google picker (it can only see the files you pick), and apply tags from the file row. Tagging does not move or rename anything in Drive.",
      },
      { type: "h2", id: "step-4", text: "Step 4: review monthly" },
      {
        type: "ol",
        items: [
          "Merge near-duplicate tags (\"Approved\" and \"Final\").",
          "Retire tags you used fewer than three times.",
          "Archive finished client work by changing its State tag, not by moving it.",
        ],
      },
      {
        type: "callout",
        text: "FolderPls supports tags with an end date, which suits \"review by\" workflows, and tags expire when you next open the app, not in the background.",
      },
      { type: "h2", id: "retrieve", text: "Finding things later" },
      { type: "p", text: "Combine groups in one filter: Client · Acme plus Approved plus 2026. In Drive itself, you can narrow with filter chips for type, people and modified date.[^search-help] Read more in [find files in Google Drive faster](/blog/find-files-in-google-drive-faster)." },
    ],
    faq: [
      {
        q: "How many tags should I start with?",
        a: "Start with about three groups, such as who, state and year, and add a group only when you keep wishing you had it.",
      },
      {
        q: "Do tags replace folders in Google Drive?",
        a: "They do not have to. Many people keep a shallow folder structure and use tags for the dimensions folders cannot hold, such as status and year.",
      },
      {
        q: "Does FolderPls change my Drive folders?",
        a: "Tagging does not move or rename your files. FolderPls only works with the files you choose in the Google picker.",
      },
    ],
    sources: [SRC_ORGANIZE_HELP, SRC_SEARCH_HELP],
  },
  {
    slug: "find-files-in-google-drive-faster",
    title: "How to find files in Google Drive faster: search operators and tags",
    seoTitle: "Find Files in Google Drive Faster: Search Operators",
    seoDescription:
      "Use Drive's filter chips and search operators like owner:, type:, before: and after:, then add tags for what search can't see. A cheat sheet.",
    description:
      "A cheat sheet of Google Drive search operators and filter chips, plus how tags help when the file name does not contain what you remember.",
    date: DATE,
    readingMinutes: 5,
    tags: ["Google Drive", "Search", "Productivity"],
    blocks: [
      {
        type: "p",
        text: "Drive search is better than most people use it. Google's help describes filter chips for type, people and modified date, and a set of advanced operators you can combine with ordinary words.[^search-help] This cheat sheet covers the ones worth memorizing, then the case search cannot solve.",
      },
      { type: "h2", id: "chips", text: "Start with filter chips" },
      {
        type: "p",
        text: "Click the search bar in Drive and pick Type, People or Modified. You can layer a chip with text: choosing a presentation type and typing a client name returns only presentations containing that word.[^search-help] Remove a chip with the x beside it, or clear all of them.",
      },
      { type: "h2", id: "operators", text: "Operators worth memorizing" },
      {
        type: "table",
        caption: "Google Drive search operators (from Google's help page)",
        head: ["Type this", "What it finds"],
        rows: [
          ["\"exact phrase\"", "Files containing that exact phrase"],
          ["salsa -dancing", "Files with the first word and without the second"],
          ["owner:name@example.com", "Files owned by that person"],
          ["type:spreadsheet", "Files of one type: document, spreadsheet, presentation, pdf, image, video and more"],
          ["before:2026-01-31 / after:2026-01-01", "Files modified before or after a date (YYYY-MM-DD)"],
          ["createdbefore: / createdafter:", "The same, by creation date"],
          ["title:Conference", "Files whose title matches"],
          ["is:starred", "Files you starred"],
          ["is:unorganized owner:me", "Files you own that ended up outside any folder after someone deleted a folder"],
        ],
      },
      {
        type: "p",
        text: "Combine them: `type:pdf after:2026-01-01 invoice` narrows to PDFs from this year that mention invoices. Google notes that not every example works on every device.[^search-help]",
      },
      { type: "h2", id: "limits", text: "Where search runs out" },
      {
        type: "p",
        text: "Search matches names, content and metadata. It cannot know that a file is \"approved\", belongs to \"Acme\" or is \"for taxes\" unless those words appear in it. That is the gap tags fill.",
      },
      { type: "h2", id: "tags", text: "Add tags for what search cannot see" },
      {
        type: "ul",
        items: [
          "Use a naming convention so the words you will search for are in the name.[^organize-help]",
          "Use stars for the handful of files you open daily.",
          "Use a tagging layer for status and client. In FolderPls you can filter by several tags at once, or type `label:approved` in the search box, and then open the file in Drive.",
        ],
      },
      { type: "p", text: "FolderPls only sees files you choose with Google's picker, and its tags are not visible to Drive search. [Try it with sample data](/demo) before you connect your Drive, or read [how to tag files in Google Drive](/blog/how-to-tag-files-in-google-drive)." },
    ],
    faq: [
      {
        q: "How do I search Google Drive by date?",
        a: "Use the Modified filter chip, or type operators such as after:2026-01-01 and before:2026-01-31 in the search bar. For creation dates use createdafter: and createdbefore:.",
      },
      {
        q: "How do I find files I own that are not in any folder?",
        a: "Google documents the operator is:unorganized, combined with owner:me, for files you created in someone else's folder that was later deleted. They move to your My Drive.",
      },
      {
        q: "Can I search Google Drive by tag?",
        a: "Drive search finds Drive Labels where your edition supports them. Tags stored in an outside tool such as FolderPls are searched inside that tool.",
      },
    ],
    sources: [SRC_SEARCH_HELP, SRC_ORGANIZE_HELP],
  },
  {
    slug: "google-drive-folder-structure-small-teams",
    title: "A Google Drive folder structure for small teams that does not rot",
    seoTitle: "Google Drive Folder Structure for Small Teams",
    seoDescription:
      "A simple Google Drive folder structure for small teams: three levels, one naming rule, shortcuts for overlap, and tags for status so folders stay shallow.",
    description:
      "A simple Google Drive folder structure for small teams: three levels, one naming rule, shortcuts for overlap and tags for status, so the structure stays usable as the team grows.",
    date: DATE,
    readingMinutes: 6,
    tags: ["Google Drive", "Teams", "Folder structure"],
    blocks: [
      {
        type: "p",
        text: "Small teams rarely fail at Drive because of a bad first structure. They fail because the structure has no rules, so each person adds their own. Google's guidance is to start simple and adjust, with folders inside folders and clear names.[^organize-help] Here is a concrete version for teams of two to fifteen people.",
      },
      { type: "h2", id: "levels", text: "Use three levels, no more" },
      {
        type: "pre",
        text: "Team Drive (or shared drive)\n├── 01 Clients\n│   ├── Acme\n│   │   ├── 2026-Website-Redesign\n│   │   └── 2026-Brand-Guidelines\n│   └── Birch\n├── 02 Internal\n│   ├── Finance\n│   └── Hiring\n├── 03 Templates\n└── 99 Archive",
      },
      {
        type: "p",
        text: "The first level is by function, the second by client or area, the third by project. Numeric prefixes keep the order stable. Deeper levels are where files get lost, so keep working files at level three and use naming for anything finer.",
      },
      { type: "h2", id: "ownership", text: "Decide who owns the files" },
      {
        type: "p",
        text: "On Google Workspace, a shared drive keeps files with the team instead of an individual, so files stay in place when someone leaves.[^shared-drives] Google's shared drive guide lists a Google Workspace account as a requirement, so on a personal Gmail account choose one person to own the top folder and share it with the rest, and write down who that is.",
      },
      { type: "h2", id: "naming", text: "One naming rule" },
      {
        type: "p",
        text: "Drive's help suggests short, meaningful names that can include dates and project names, with a date format such as year-month-day.[^organize-help] Pick one pattern and write it at the top of the structure: `YYYY-MM-DD_Client_Document_vN`. Dates in that order sort chronologically on their own.",
      },
      { type: "h2", id: "overlap", text: "Handle overlap with shortcuts, not copies" },
      {
        type: "p",
        text: "When a file belongs in two places, add a shortcut rather than a duplicate. A shortcut is a link to the original, and deleting it does not delete the file.[^organize-help] Copies drift apart; shortcuts do not.",
      },
      { type: "h2", id: "status", text: "Keep status out of the folders" },
      {
        type: "p",
        text: "\"Draft\", \"In review\" and \"Approved\" change weekly. Putting them in folder names forces a move on every change and breaks links people saved. Track status with a different mechanism: Drive Labels if your edition has them and an admin sets them up,[^editions] or a tagging layer. [FolderPls](/) lets each person tag the files they choose with their own status tags without moving anything. Tags live in each person's browser, not in Drive, so they are not shared with anyone else.",
      },
      { type: "h2", id: "checklist", text: "A 20-minute setup checklist" },
      {
        type: "ol",
        items: [
          "Create the top-level folders and number them.",
          "Write the naming rule in a short document at the top of the structure.",
          "Name one owner for each top-level folder.",
          "Move only the active projects in; archive the rest into 99 Archive.",
          "Choose how you will track status, and write it down too.",
        ],
      },
      { type: "p", text: "Related: [organize Google Drive files by tags](/blog/organize-google-drive-files-by-tags) and [Drive Labels alternatives](/blog/google-drive-labels-alternative)." },
    ],
    faq: [
      {
        q: "How many folder levels should a small team use?",
        a: "Three is a practical limit: function, then client or area, then project. Deeper nesting makes files harder to find, so use file names for finer detail.",
      },
      {
        q: "Should status like Draft or Approved be a folder?",
        a: "Usually not. Status changes often, and moving files between folders breaks saved links. Track it with Drive Labels where available, or with tags.",
      },
      {
        q: "What is the difference between a shared drive and a shared folder?",
        a: "Per Google, unlike files in My Drive, files in a shared drive belong to the team instead of an individual, so they stay in place when members leave. Google's shared drive guide lists a Google Workspace account as a requirement.",
      },
    ],
    sources: [SRC_ORGANIZE_HELP, SRC_SHARED_DRIVES, SRC_LABELS_EDITIONS],
  },
];
