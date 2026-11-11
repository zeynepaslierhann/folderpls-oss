/**
 * Google Drive Labels vs FolderPls — the facts behind the comparison block on
 * the landing and pricing pages (and the Drive Labels blog post).
 *
 * Every Google claim links to a Google help page that was re-read on the date
 * below. Keep the tone factual: where Drive Labels is the better fit, say so.
 * Note: an earlier internal research note said "5 labels per file"; that claim is
 * intentionally NOT used anywhere. The 150 limit is worded differently on Google's
 * two pages (Drive Help: up to 150 labels per file; Admin Help: up to 150 labels per
 * organization and any number per file, read 2026-10-14), so it is never stated as a
 * plain fact: the per-file row reports both wordings.
 */

// Both sources were re-read on 2026-10-19 with the same result for the rows below; the date stays
// 2026-10-14 because the blog posts and tests pin it. The "folders" and "bulk" rows were added
// from the 2026-10-19 reading (Admin Help: no labels on folders, shortcuts, shared drives or files
// owned by another organization; Drive Help: bulk apply up to 100 files).
export const COMPARISON_CHECKED_ON = "2026-10-14";

export interface ComparisonSource {
  id: string;
  title: string;
  url: string;
}

export const COMPARISON_SOURCES: ComparisonSource[] = [
  {
    id: "editions",
    title: "Google Workspace Admin Help: Get started as a classification labels admin (supported editions)",
    url: "https://knowledge.workspace.google.com/admin/security/get-started-as-a-classification-labels-admin",
  },
  {
    id: "apply",
    title: "Google Drive Help: Apply labels to files in Google Drive",
    url: "https://support.google.com/drive/answer/13495216",
  },
];

type Localized = { en: string; tr: string };

export interface ComparisonRow {
  id: string;
  feature: Localized;
  driveLabels: Localized;
  folderpls: Localized;
  /** Which side this row favours; "neutral" rows are there for honesty. */
  edge: "folderpls" | "drive-labels" | "neutral";
  sourceIds: string[];
  /** Shown in the compact (landing) version too. */
  compact: boolean;
}

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    id: "personal",
    feature: { en: "Personal Google accounts (@gmail.com)", tr: "Kişisel Google hesapları (@gmail.com)" },
    driveLabels: {
      en: "Not available: Drive Labels are a Google Workspace feature",
      tr: "Yok: Drive etiketleri bir Google Workspace özelliği",
    },
    folderpls: {
      en: "Yes, FolderPls works with any Google account that can use Drive",
      tr: "Var, FolderPls Drive kullanabilen her Google hesabıyla çalışır",
    },
    edge: "folderpls",
    sourceIds: ["editions"],
    compact: true,
  },
  {
    id: "editions",
    feature: { en: "Workspace editions", tr: "Workspace sürümleri" },
    driveLabels: {
      en: "Business Standard / Plus, Enterprise, Education Standard / Plus, Frontline and Essentials editions, but not Business Starter",
      tr: "Business Standard / Plus, Enterprise, Education Standard / Plus, Frontline ve Essentials sürümleri; Business Starter'da yok",
    },
    folderpls: {
      en: "Not tied to your edition",
      tr: "Sürüme bağlı değil",
    },
    edge: "folderpls",
    sourceIds: ["editions"],
    compact: true,
  },
  {
    id: "who-creates",
    feature: { en: "Who creates the labels", tr: "Etiketleri kim oluşturur" },
    driveLabels: {
      en: "Only administrators; users apply what the admin set up",
      tr: "Yalnızca yöneticiler; kullanıcılar yöneticinin kurduğunu uygular",
    },
    folderpls: { en: "You: create your own tags in seconds", tr: "Sen: kendi etiketlerini saniyeler içinde oluştur" },
    edge: "folderpls",
    sourceIds: ["apply"],
    compact: true,
  },
  {
    id: "folders",
    feature: { en: "Labeling folders", tr: "Klasörleri etiketleme" },
    driveLabels: {
      en: "Labels can't be applied to folders, shortcuts or shared drives themselves, nor to files owned by another organization",
      tr: "Etiketler klasörlere, kısayollara ya da paylaşılan sürücülerin kendisine uygulanamaz; başka bir kuruluşa ait dosyalara da uygulanamaz",
    },
    folderpls: {
      en: "Files and folders you pick can both carry tags",
      tr: "Seçtiğin dosyalar da klasörler de etiket taşıyabilir",
    },
    edge: "folderpls",
    sourceIds: ["editions"],
    compact: true,
  },
  {
    id: "bulk",
    feature: { en: "Tagging many files at once", tr: "Çok dosyayı tek seferde etiketleme" },
    driveLabels: {
      en: "Yes, up to 100 files at a time, on a computer",
      tr: "Evet, bilgisayarda tek seferde en fazla 100 dosya",
    },
    folderpls: {
      en: "Yes: select several files and apply labels in one step; if some fail you are told which, and a retry only touches those",
      tr: "Var: birkaç dosyayı seçip etiketleri tek adımda uygularsın; bazıları kaydedilemezse hangileri olduğu söylenir, yeniden deneme yalnız onlara dokunur",
    },
    edge: "neutral",
    sourceIds: ["apply"],
    compact: false,
  },
  {
    id: "mobile",
    feature: { en: "Tagging on a phone", tr: "Telefondan etiketleme" },
    driveLabels: {
      en: "Can't apply or change labels in the Drive mobile app (view only)",
      tr: "Drive mobil uygulamasında etiket uygulanamaz ya da değiştirilemez (yalnız görüntüleme)",
    },
    folderpls: {
      en: "Works in the phone's browser (no native app; layout is desktop-first)",
      tr: "Telefonun tarayıcısında çalışır (yerel uygulama yok; arayüz masaüstü öncelikli)",
    },
    edge: "neutral",
    sourceIds: ["apply"],
    compact: true,
  },
  {
    id: "per-file",
    feature: { en: "Labels per file", tr: "Dosya başına etiket" },
    driveLabels: {
      en: "Google's pages differ: Drive Help says up to 150 per file; the admin documentation says up to 150 per organization and any number per file",
      tr: "Google'ın sayfaları farklı yazıyor: Drive Yardım dosya başına en fazla 150 diyor; yönetici belgeleri kuruluş başına en fazla 150 etiket, dosya başına herhangi bir sayı diyor",
    },
    folderpls: { en: "No fixed per-file cap", tr: "Dosya başına sabit sınır yok" },
    edge: "neutral",
    sourceIds: ["editions", "apply"],
    compact: false,
  },
  {
    id: "native",
    feature: { en: "Inside Drive itself", tr: "Drive'ın içinde" },
    driveLabels: {
      en: "Yes: searchable in Drive search and usable in admin policies (e.g. DLP)",
      tr: "Evet: Drive aramasında bulunur, yönetici politikalarında (ör. DLP) kullanılabilir",
    },
    folderpls: {
      en: "No: tags live in your browser and reach another device only through a backup in your Drive or a JSON file; you filter in FolderPls, then open the file in Drive",
      tr: "Hayır: etiketler tarayıcında durur ve başka cihaza yalnız Drive'ındaki yedekle ya da JSON dosyasıyla geçer; FolderPls'te filtreler, dosyayı Drive'da açarsın",
    },
    edge: "drive-labels",
    sourceIds: ["editions", "apply"],
    compact: false,
  },
];
