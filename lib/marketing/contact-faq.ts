/**
 * /contact sayfası SSS: TEK kaynak.
 *
 * Hem görünen bölüm (app/(marketing)/contact/page.tsx) hem FAQPage JSON-LD'si
 * (components/seo/faq-schema.tsx) buradan beslenir; önceden iki ayrı kopya vardı ve
 * kayma riski taşıyordu (ana sayfa SSS'si için yapılan düzenlemenin eşi: lib/marketing/home-faq.ts).
 *
 * Metinler kodla birebir olmalı: etiketleme dosyayı taşımaz, ama FolderPls kullanıcı isterse
 * dosya kopyalayabilir, taşıyabilir, yeniden adlandırabilir ve silebilir (/features). Bu yüzden
 * "Asla / Never" gibi mutlak sözler ve "Drive yapınızdan tamamen bağımsız" ifadesi YOKTUR.
 */
import type { FaqItem } from "@/lib/marketing/home-faq";

export const CONTACT_FAQ: readonly FaqItem[] = [
  {
    q: "Are my files moved from Google Drive to another location?",
    a: "No. Your files stay in Google Drive. In your browser, FolderPls keeps each tagged file's Drive ID, name and type, plus the labels and notes you add. File contents stay in Drive; FolderPls doesn't copy them.",
  },
  {
    q: "Will my Drive folder structure break when using FolderPls?",
    a: "No. Tagging doesn't change your Drive folders: labels and notes live in your browser, on top of your existing structure. Nothing is moved or reorganized unless you copy, move, rename or delete a file yourself.",
  },
  {
    q: "How do Drive permissions work?",
    a: "FolderPls opens files with your own Google access, so a file you can't open in Drive can't be opened from FolderPls either. Your tags and notes are only in your browser, so nobody else sees them, even on shared files.",
  },
  {
    q: "Where is metadata stored?",
    a: "In your browser's storage (IndexedDB), on the device you use. It doesn't reach our servers and isn't written into the files. While Drive is connected it's also backed up to a folderpls-tags.json file in your own Drive, and you can export a JSON file any time.",
  },
  {
    q: "Why filtering instead of just searching?",
    a: "Searching requires you to remember the file name. Filtering lets you say 'show me the approved marketing files', which is closer to how people think.",
  },
  {
    q: "Can I use FolderPls with multiple Google Drive accounts?",
    a: "FolderPls works with one Google Drive account at a time. To switch, disconnect Google Drive under Data and Drive, then connect the other account. Your tags stay in the browser.",
  },
  {
    q: "What happens if I delete a label?",
    a: "When you delete a label, it's removed from all files that had it. The files themselves remain unchanged in Google Drive.",
  },
  {
    q: "Is FolderPls free to use?",
    a: "Yes. FolderPls is free and open source. There are no paid plans, and you don't need an account.",
  },
];
