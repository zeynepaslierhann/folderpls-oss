/**
 * "Does my Google account have Drive Labels?" karar aracının verisi ve mantığı.
 *
 * Araç TAMAMEN istemcide çalışır: Google'a bağlanmaz, Drive okumaz, hiçbir API çağırmaz; cevaplar
 * hiçbir yere gönderilmez ya da saklanmaz (bkz. tests/unit/drive-labels-checker.test.ts, kaynak taraması).
 * Söz yalnız ARACIN kendisi içindir: sayfa kabuğu (kök düzen, apis.google.com
 * preconnect) bu dosyaların dışındadır. Bu yüzden görünen metin "sayfa hiç ağ isteği atmaz"
 * DEMEZ; "Google'a giriş yapmaz, Drive'ınızı okumaz, cevaplarınız gönderilmez ya da saklanmaz" der.
 *
 * Doğruluk kaynağı yalnız iki herkese açık Google sayfasıdır; ikisi de 14 Eki 2026'da yeniden okundu:
 *  - editions: Workspace Admin Help "Get started as a classification labels admin" (desteklenen sürümler
 *    listesi, "Manage Labels" yetkisi; sayfada "Last updated 2026-10-09 UTC").
 *  - apply: Drive Help "Apply labels to files in Google Drive" (yalnız yöneticiler etiket oluşturur, dosya
 *    başına 150, bir seferde 100 dosya, mobil uygulamada uygulama/değiştirme yok).
 * Sürüm listesi Google'da DEĞİŞİR: liste burada elle tutulur ve tarihle işaretlenir; testler listeyi sabitler,
 * Google değiştirirse bu dosya ve CHECKER_CHECKED_ON birlikte güncellenir.
 *
 * Ton: dürüst. Drive Labels'ın doğru seçim olduğu durumda öyle söylenir (kurum uygun sürümdeyse ve yönetici
 * ortak bir sınıflandırma istiyorsa). FolderPls yalnız etiketlerin KULLANILAMADIĞI durumlarda seçenek olarak anılır.
 * Ürün cümleleri canlı kodla birebir tutulur: etiketleme dosyayı taşımaz (FolderPls kullanıcı isterse dosya
 * kopyalar, taşır, yeniden adlandırır ve siler; /features), etiketler tarayıcıda durur ve Drive'ın kendi
 * aramasında görünmez, yalnız seçilen dosyalar görülür (drive.file), arayüz masaüstü öncelikli.
 */

import { COMPARISON_SOURCES } from "@/lib/marketing/drive-labels-comparison";

/** Google sayfalarının okunduğu gün (ISO). Araç sayfasında "son doğrulama" olarak görünür. */
export const CHECKER_CHECKED_ON = "2026-10-14";

export type CheckerSourceId = "editions" | "apply";

export interface CheckerSource {
  id: CheckerSourceId;
  title: string;
  url: string;
}

const sourceUrl = (id: CheckerSourceId): string => {
  const found = COMPARISON_SOURCES.find((s) => s.id === id);
  if (!found) throw new Error(`Drive Labels kaynağı bulunamadı: ${id}`);
  return found.url;
};

export const CHECKER_SOURCES: CheckerSource[] = [
  {
    id: "editions",
    title: "Google Workspace Admin Help: Get started as a classification labels admin",
    url: sourceUrl("editions"),
  },
  {
    id: "apply",
    title: "Google Drive Help: Apply labels to files in Google Drive",
    url: sourceUrl("apply"),
  },
];

/** Sayfa içi kaynak bağlantısının hedef kimliği (araç ve sayfa aynı değeri kullanır). */
export function checkerSourceAnchor(id: CheckerSourceId): string {
  return `checker-source-${id}`;
}

export function checkerSourceNumber(id: CheckerSourceId): number {
  return CHECKER_SOURCES.findIndex((s) => s.id === id) + 1;
}

// ---------------------------------------------------------------- sürümler

export interface Edition {
  id: string;
  name: string;
}

/**
 * Google'ın "Supported editions for this feature" satırı (14 Eki 2026), sırası korunarak:
 * Frontline Starter, Frontline Standard, Frontline Plus; Business Standard, Business Plus;
 * Enterprise Standard, Enterprise Plus; Education Standard, Education Plus;
 * Essentials, Enterprise Essentials, Enterprise Essentials Plus; G Suite Business.
 */
export const SUPPORTED_EDITIONS: readonly Edition[] = [
  { id: "frontline-starter", name: "Frontline Starter" },
  { id: "frontline-standard", name: "Frontline Standard" },
  { id: "frontline-plus", name: "Frontline Plus" },
  { id: "business-standard", name: "Business Standard" },
  { id: "business-plus", name: "Business Plus" },
  { id: "enterprise-standard", name: "Enterprise Standard" },
  { id: "enterprise-plus", name: "Enterprise Plus" },
  { id: "education-standard", name: "Education Standard" },
  { id: "education-plus", name: "Education Plus" },
  { id: "essentials", name: "Essentials" },
  { id: "enterprise-essentials", name: "Enterprise Essentials" },
  { id: "enterprise-essentials-plus", name: "Enterprise Essentials Plus" },
  { id: "g-suite-business", name: "G Suite Business" },
];

/** Google'ın listesinde OLMAYAN, ama kullanıcının sık seçeceği sürüm. */
export const BUSINESS_STARTER: Edition = { id: "business-starter", name: "Business Starter" };

/** Listeden bağımsız seçenek: sürümünü bilmeyen ya da listede adı geçmeyen sürüm. */
export const OTHER_EDITION_ID = "other";

/**
 * Seçim kutusunun sırası. Aile sırasıyla dizilir; "listede mi" bilgisi etikette SIZMAZ
 * (kullanıcı cevabı görmeden seçsin).
 */
export const EDITION_CHOICES: readonly Edition[] = [
  BUSINESS_STARTER,
  { id: "business-standard", name: "Business Standard" },
  { id: "business-plus", name: "Business Plus" },
  { id: "enterprise-standard", name: "Enterprise Standard" },
  { id: "enterprise-plus", name: "Enterprise Plus" },
  { id: "enterprise-essentials", name: "Enterprise Essentials" },
  { id: "enterprise-essentials-plus", name: "Enterprise Essentials Plus" },
  { id: "essentials", name: "Essentials" },
  { id: "education-standard", name: "Education Standard" },
  { id: "education-plus", name: "Education Plus" },
  { id: "frontline-starter", name: "Frontline Starter" },
  { id: "frontline-standard", name: "Frontline Standard" },
  { id: "frontline-plus", name: "Frontline Plus" },
  { id: "g-suite-business", name: "G Suite Business" },
  { id: OTHER_EDITION_ID, name: "Another edition, or I don't know" },
];

export function isSupportedEdition(id: string | null | undefined): boolean {
  return SUPPORTED_EDITIONS.some((e) => e.id === id);
}

function editionName(id: string): string {
  return EDITION_CHOICES.find((e) => e.id === id)?.name ?? id;
}

// ---------------------------------------------------------------- cevaplar

export type AccountKind = "personal" | "workspace" | "unsure";
export type LabelsInDrive = "yes" | "no";

export interface CheckerAnswers {
  account: AccountKind | null;
  /** Yalnız `account === "workspace"` iken anlamlı. */
  edition: string | null;
  /** Yalnız sürüm listede iken sorulur: Drive'da sağ tıklayınca "Labels" görünüyor mu? */
  labelsInDrive: LabelsInDrive | null;
}

export const EMPTY_ANSWERS: CheckerAnswers = { account: null, edition: null, labelsInDrive: null };

/** Hesap türü değişince sürüm ve "Labels görünüyor mu" cevabı geçersizdir: sıfırlanır. */
export function chooseAccount(_prev: CheckerAnswers, account: AccountKind): CheckerAnswers {
  return { account, edition: null, labelsInDrive: null };
}

/** Sürüm değişince "Labels görünüyor mu" cevabı geçersizdir: sıfırlanır. */
export function chooseEdition(prev: CheckerAnswers, edition: string): CheckerAnswers {
  return { ...prev, edition, labelsInDrive: null };
}

export function chooseLabelsInDrive(prev: CheckerAnswers, labelsInDrive: LabelsInDrive): CheckerAnswers {
  return { ...prev, labelsInDrive };
}

export const ACCOUNT_CHOICES: readonly { id: AccountKind; label: string; hint: string }[] = [
  {
    id: "personal",
    label: "Personal Google account",
    hint: "No Google Workspace subscription behind it. A personal account can use a Gmail address or any other email.",
  },
  {
    id: "workspace",
    label: "Work or school account",
    hint: "Your organization pays for Google Workspace, or you do, for your own business domain. Someone manages it in an admin console.",
  },
  {
    id: "unsure",
    label: "I'm not sure",
    hint: "We'll show a quick way to find out.",
  },
];

// ---------------------------------------------------------------- sonuç

export type CheckerStatus = "incomplete" | "unavailable" | "possible" | "unclear";

export interface CheckerFact {
  text: string;
  sourceId?: CheckerSourceId;
}

export interface CheckerOption {
  title: string;
  text: string;
  href?: string;
  linkLabel?: string;
}

export interface CheckerResult {
  status: CheckerStatus;
  headline: string;
  summary: string;
  facts: CheckerFact[];
  nextSteps: string[];
  /** true iken araç "Drive'da Labels görünüyor mu?" sorusunu gösterir (yalnız listedeki sürümlerde). */
  asksLabelsInDrive: boolean;
  options: CheckerOption[];
}

const FACT_ADMIN_CREATES: CheckerFact = {
  text: "Only administrators can create labels. To apply one, the administrator must give you access, and you need edit access to the file.",
  sourceId: "apply",
};

const FACT_PHONE: CheckerFact = {
  text: "In the Drive mobile app you can view labels but you can't apply or change them.",
  sourceId: "apply",
};

const OPTION_NAMING: CheckerOption = {
  title: "Put the tags in the file name",
  text: "For example 2026_acme_logo_approved.pdf. It's free and Drive search finds it, but one rename and the tag is gone.",
};

const OPTION_SHORTCUTS: CheckerOption = {
  title: "Use shortcuts for files that belong in two places",
  text: "Drive's Add shortcut shows one file in several folders. Every new category is still another folder to maintain.",
};

const OPTION_FOLDERPLS: CheckerOption = {
  title: "Add a tagging layer on top of Drive",
  text: "FolderPls keeps your files where they are and keeps your own tags in your browser. You pick files with Google's file picker, tag them, filter by tag and open the file in Drive. It is free and works with any Google account that can use Drive. Because the tags live in your browser, Drive's own search can't see them, and the layout is built for a desktop first.",
  href: "/blog/folderpls-vs-google-drive-labels",
  linkLabel: "FolderPls vs Drive Labels, side by side",
};

const OPTION_OTHER_EDITION: CheckerOption = {
  title: "Ask your admin about a different edition",
  text: "Business Standard and Business Plus are on Google's list. Which edition your organization pays for is your admin's decision.",
};

const DRIVE_TEST =
  "In Drive on a computer, right-click a file. If you see a Labels item, labels are switched on for you. If you don't, Google says your administrator may not have set up labels or allowed you access.";

/** Kişisel hesabı seçen Workspace kullanıcısının (kendi alan adına Workspace açan serbest çalışan) seçimini düzeltmesi için. */
const PERSONAL_DOUBLE_CHECK =
  "Not sure it is a personal account? If you pay for Google Workspace, even for your own business domain, go back and choose \"Work or school account\". If you right-click a file in Drive on a computer and see a Labels item, that is another sign it is a Workspace account.";

/** Cevaplar eksikse true: araç sonuç kartı yerine yönlendirme gösterir. */
export function isIncomplete(a: CheckerAnswers): boolean {
  if (a.account === null) return true;
  if (a.account === "workspace" && a.edition === null) return true;
  return false;
}

/**
 * Cevaplardan sonuç üretir (saf fonksiyon, test edilir).
 * Kural: sürüm Google'ın listesindeyse "mümkün ama yönetici kurmalı"; Business Starter ve kişisel hesap
 * listede değil; adı geçmeyen/bilinmeyen sürüm ve emin olmayan kullanıcı için "belirsiz".
 */
export function evaluateChecker(a: CheckerAnswers): CheckerResult {
  if (isIncomplete(a)) {
    return {
      status: "incomplete",
      headline: "",
      summary: "",
      facts: [],
      nextSteps: [],
      asksLabelsInDrive: false,
      options: [],
    };
  }

  if (a.account === "personal") {
    return {
      status: "unavailable",
      headline: "Not available: Drive Labels are a Workspace feature",
      summary:
        "Google lists only Workspace editions as supported, and describes Drive labels as something your organization sets up for work or school. A personal Google account is not a Workspace edition, so it is not on the list.",
      facts: [
        { text: "Google's supported-editions list names Workspace editions only. Personal Google accounts are not on it.", sourceId: "editions" },
        FACT_ADMIN_CREATES,
      ],
      nextSteps: [
        "You don't need to hunt for a Labels menu in Drive. It is expected to be missing on a personal account.",
        "Pick one of the options below to get tag-like organization anyway.",
        PERSONAL_DOUBLE_CHECK,
      ],
      asksLabelsInDrive: false,
      options: [OPTION_NAMING, OPTION_SHORTCUTS, OPTION_FOLDERPLS],
    };
  }

  if (a.account === "unsure") {
    return {
      status: "unclear",
      headline: "Two quick ways to find out",
      summary:
        "A personal Google account has no Google Workspace subscription behind it. A Workspace account is paid for by an organization, or by you for your own business domain, and an admin manages it. Drive Labels exist only on the second kind, and only on some editions.",
      facts: [
        { text: "Google's supported-editions list names Workspace editions only.", sourceId: "editions" },
        FACT_ADMIN_CREATES,
      ],
      nextSteps: [
        "If nobody pays for Google Workspace for this account and there is no admin console behind it, choose \"Personal Google account\" above.",
        "If your employer or school gave you the account, or you pay for Google Workspace for your own domain, choose \"Work or school account\" and pick the edition, or ask your admin.",
        DRIVE_TEST,
      ],
      asksLabelsInDrive: false,
      options: [],
    };
  }

  // Work or school account
  const edition = a.edition ?? OTHER_EDITION_ID;

  if (edition === BUSINESS_STARTER.id) {
    return {
      status: "unavailable",
      headline: "Not on Google's list: Business Starter",
      summary:
        "Google's supported-editions list for Drive Labels does not include Business Starter, so labels are not offered on that edition.",
      facts: [{ text: "The supported-editions list names Business Standard and Business Plus, but not Business Starter.", sourceId: "editions" }, FACT_ADMIN_CREATES],
      nextSteps: ["Google changes what each edition includes. Check the current list on Google's page before you decide anything."],
      asksLabelsInDrive: false,
      options: [OPTION_OTHER_EDITION, OPTION_NAMING, OPTION_SHORTCUTS, OPTION_FOLDERPLS],
    };
  }

  if (isSupportedEdition(edition)) {
    const name = editionName(edition);
    const steps: string[] =
      a.labelsInDrive === "yes"
        ? [
            "Right-click a file in Drive on a computer, choose Labels, then Apply labels, and pick the label.",
            "You can also apply a label to up to 100 files at once from Drive on a computer.",
          ]
        : a.labelsInDrive === "no"
          ? [
              "Google says that when the Labels section is missing, your administrator may not have set up labels or allowed you access. Ask your admin.",
              "If you are the admin: creating labels needs at least the Manage Labels privilege.",
            ]
          : [DRIVE_TEST];
    return {
      status: "possible",
      headline: "Your edition is on Google's list",
      summary: `${name} is one of the editions Google lists for Drive Labels. Whether you can use them still depends on your admin: only administrators create labels, and an admin has to give you access.`,
      facts: [
        { text: `${name} appears in Google's supported-editions list.`, sourceId: "editions" },
        FACT_ADMIN_CREATES,
        FACT_PHONE,
      ],
      nextSteps: steps,
      asksLabelsInDrive: true,
      options: [
        {
          title: "If Drive Labels don't fit",
          text: "A shared taxonomy managed by admins is what Drive Labels are good at, and they live inside Drive. If you want your own tags without waiting for an admin, FolderPls is a separate, free tagging layer, with the trade-off that its tags don't show up in Drive search.",
          href: "/blog/folderpls-vs-google-drive-labels",
          linkLabel: "FolderPls vs Drive Labels, side by side",
        },
      ],
    };
  }

  // Listede adı geçmeyen ya da bilinmeyen sürüm
  return {
    status: "unclear",
    headline: "We can't tell from that",
    summary:
      "Google's list names 13 editions, shown further down this page. If yours is not one of them, or you don't know which edition you have, your Workspace admin can tell you.",
    facts: [{ text: "Google's supported-editions list is short and specific. See it below on this page.", sourceId: "editions" }, FACT_ADMIN_CREATES],
    nextSteps: ["Compare your edition with the list below, or ask your admin.", DRIVE_TEST],
    asksLabelsInDrive: false,
    options: [OPTION_OTHER_EDITION, OPTION_NAMING, OPTION_SHORTCUTS, OPTION_FOLDERPLS],
  };
}

// ---------------------------------------------------------------- sık sorulanlar (sayfada görünür metin)

export interface CheckerFaqItem {
  q: string;
  a: string;
  sourceId?: CheckerSourceId;
  href?: string;
  linkLabel?: string;
}

export const CHECKER_FAQ: readonly CheckerFaqItem[] = [
  {
    q: "Does a personal Gmail account have Drive Labels?",
    a: "Not according to Google's documentation. Drive Labels are described as a Workspace feature, and personal Google accounts are not on the supported-editions list.",
    sourceId: "editions",
  },
  {
    q: "Does Google Workspace Business Starter have Drive Labels?",
    a: "It is not on Google's list. Business Standard and Business Plus are listed; Business Starter is not (checked on the date shown on this page).",
    sourceId: "editions",
  },
  {
    q: "Who can create Drive labels?",
    a: "Only administrators. Creating labels needs at least the Manage Labels privilege. People in the organization then apply the labels an admin has shared with them.",
    sourceId: "editions",
  },
  {
    q: "Can I apply Drive labels from my phone?",
    a: "No. Google's Drive Help says you can't apply or change labels in the mobile app. You can view them there.",
    sourceId: "apply",
  },
  {
    q: "How can I tag Google Drive files without Drive Labels?",
    a: "With workarounds: naming conventions, shortcuts, or a separate tagging layer that keeps the tags outside Drive.",
    href: "/blog/tag-google-drive-files-personal-gmail",
    linkLabel: "Four ways to tag Drive files on a personal Gmail account",
  },
];
