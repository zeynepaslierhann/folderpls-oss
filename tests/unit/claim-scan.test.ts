import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { visibleTexts, walk } from "./helpers/visible-text";

/**
 * Kanıtsız iddia taraması (hesapsız yerel mod).
 *
 * Kural: kullanıcıya görünen metinde (sayfalar, bileşenler, çeviri sözlüğü, blog, yasal metin)
 * aşağıdaki ifadeler YOK. Her biri kodla çelişir ya da kanıtsızdır:
 *  - "Public Beta" / "public beta": ürün genel kullanıma açık, beta etiketi kanıtsız.
 *  - "AI": üretimde yapay zekâ yolu yok; otomatik etiket özelliği tümüyle kaldırıldı.
 *  - "Auto-tag" / "otomatik etiket": özellik, rotası ve arayüzü kaldırıldı (9 Kas 2026).
 *  - "entire Drive", "entire Google Drive", "Full Drive Access": yalnız `drive.file` kapsamı var, yani yalnız
 *    Picker ile seçilen dosyalar. ("entire Google Drive" /features'ta vardı ve eski `entire Drive` deseninden
 *    kaçıyordu.)
 *  - "Real-time Sync", "vice versa", "instantly reflected": etiketler tarayıcıda; Drive'a yazılmaz ve anlık
 *    eşitleme yok. Desen eşitleme bağlamına DARALTILDI: "Real-time search results as you type" gibi arama için
 *    meşru kullanım yanlış pozitif vermesin.
 *  - "syncs automatically", "across devices" eşitleme sözü: anlık cihazlar arası eşitleme yok. Drive bağlıyken
 *    JSON yedeği güncellenir, başka cihaz onu yalnız açılışta ya da bağlanınca okur; doğru söz "yedeklenir".
 *  - "Tags live in FolderPls", "stored in our databases": sunucu yok, etiketler tarayıcıda (IndexedDB).
 *  - SSS'de "Never." / "Asla." ve "Drive yapınızdan tamamen bağımsız": FolderPls kullanıcı isterse dosya
 *    kopyalar, taşır, yeniden adlandırır ve siler (/features); yalnız ETİKETLEME klasörleri değiştirmez.
 *  - "Not a staged demo": anlatım görselleri CSS maketi.
 *  - "Watch Demo": sitede video yok; düğme sayfa içindeki etkileşimli anlatıma kaydırır ("See how it works").
 *  - "across teams", "surface automatically", "living, breathing", "file counts explode":
 *    kodla desteklenmeyen ya da abartılı anlatım.
 *  - "Most Popular": ücretli plan yok; sosyal kanıt iddiası.
 *  - "only stores file IDs": etiketli dosyanın adı ve türü de tutulur (gizlilik politikası §2.1).
 *  - "We never move your files" / "100% compatible": FolderPls dosya kopyalama, taşıma, yeniden adlandırma ve silme
 *    sunar (/features); yalnız ETİKETLEME dosyayı taşımaz. "%100 uyumlu" ölçülmedi, kanıtsız.
 *  - "Pick your folder" / "Klasörünü seç" (ana sayfa 'Nasıl çalışır' 1. adım): Picker'da klasör seçmek alt
 *    dosyalara erişim vermiyor (drive.file). Dış metin "klasör seç" demez.
 *  - "No credit card required" / "Free trials do not require a card": ödeme akışı da kart da yok; bu söz
 *    ücretli bir ürünü ima eder.
 *  - Pro/Team/Free plan adları, "a paid plan", "free trial", "sign up", "create an account", "Cancel anytime":
 *    ürün ücretsiz ve hesapsız (9 Kas 2026). "Ücretli plan yok" gibi olumsuz cümleler serbest.
 *  - "Firebase", "Firestore", "Lemon Squeezy": bağımlılıklar kaldırıldı; görünen metinde sağlayıcı olarak geçemez.
 *
 * Yorum satırları AST'de olmadığı için taranmaz. Tarama kaynak düzeyindedir; derlenmiş HTML için
 * ayrıca plan §9 betiği çalıştırılır.
 */

const ROOT = path.resolve(__dirname, "../..");

interface Claim {
  id: string;
  pattern: RegExp;
}

export const BANNED_CLAIMS: Claim[] = [
  { id: "entire-drive", pattern: /entire (?:Google )?Drive/i },
  { id: "ai", pattern: /\bAI\b/ },
  { id: "full-drive", pattern: /Full Drive/i },
  { id: "real-time", pattern: /real[- ]?time\s+(?:sync|syncing|synchroni[sz]ation|updates?)|(?:sync\w*|reflected)\b[^.]{0,40}\bin real[- ]?time/i },
  { id: "vice-versa", pattern: /\bvice versa\b|instantly reflected/i },
  { id: "faq-never", pattern: /^\s*(?:Never|Asla)\.(?:\s|$)/ },
  {
    id: "faq-independent-structure",
    pattern: /completely independently of your Drive folder structure|works completely on top of your existing structure|Drive klasör yapınızdan tamamen bağımsız/i,
  },
  { id: "public-beta", pattern: /public beta/i },
  { id: "staged-demo", pattern: /staged demo/i },
  // Sitede video yok (<video>/<iframe> 0): "Watch Demo" düğmesi yalnız sayfa içi anlatıma kaydırır.
  { id: "watch-demo", pattern: /Watch (?:the )?Demo|Demoyu izle|Demo izle/i },
  { id: "across-teams", pattern: /across teams/i },
  { id: "surface-automatically", pattern: /surface automatically/i },
  { id: "living-breathing", pattern: /living, breathing/i },
  { id: "file-counts-explode", pattern: /file counts explode/i },
  { id: "most-popular", pattern: /most popular|en popüler/i },
  // Kayıtlı veri: etiketli dosyanın adı ve türü de saklanır (gizlilik politikası §2.2); "yalnız kimlik" doğru değil.
  { id: "only-ids", pattern: /only stores file IDs|sadece dosya kimliklerini/i },
  // Mutlak söz: ürün dosyayı taşıyabilir (/features). Doğru söz "etiketleme dosyayı taşımaz".
  { id: "never-move", pattern: /We (?:never|don'?t) move your files|asla taşımıyoruz|Dosyaları taşımıyoruz/i },
  { id: "full-compat", pattern: /100% compatible|%100 uyumlu/i },
  // Picker'da klasör seçmek çocuklarına erişim VERMİYOR (drive.file). Panel içi
  // onboarding/boş durum metinleri de artık "klasör bağla" demez; ana akış "dosyaları seç".
  { id: "pick-folder", pattern: /Pick your folder|Choose an existing Drive folder|Klasörünü seç(?![a-zçğıöşü])|Picker ile mevcut bir Drive klasörü|Connect your Drive folder|Pick an existing Drive folder|Drive klasörünüzü bağlayın|Mevcut bir Drive klasörünü seçin|works inside one Drive folder|tek bir Drive klasörünün içinde çalışır/ },
  { id: "no-card-en", pattern: /No credit card required/i },
  { id: "trial-no-card-terms", pattern: /do not require a card/i },
  // sahip (owner) verisi DriveFile'da yok, filtre yok (lib/search/filters.ts); "ayrı metadata seti" ve
  // departman filtresi yok (özellikler + etiketler var); Team'de etiket/notlar üyelere açık, "FolderPls'te de göremez" yanlış.
  { id: "owner-filter", pattern: /status, channel, owner|Duruma, kanala veya kişiye göre/i },
  { id: "metadata-sets", pattern: /separate metadata sets|ayrı metadata setleri/i },
  { id: "department-filter", pattern: /department-based filters|departman bazlı filtreleme/i },
  { id: "permissions-mirror", pattern: /won'?t (?:be able to )?see it in FolderPls either|FolderPls üzerinde de o dosyayı göremez/i },
  // bağlantı Google izin ekranından geçer (tek tık değil); "%100 Drive'da" etiket/not FolderPls'te durduğu için
  // fazla mutlak; "ortak arama" doğrulanmadı (paylaşılan etiket + grafik vardı).
  { id: "connect-one-click", pattern: /Connect Google Drive in one click|Tek tıkla Google Drive/i },
  { id: "hundred-percent-drive", pattern: /stay 100% in Google Drive|%100 Google Drive'da kalır/i },
  { id: "shared-search", pattern: /Shared search and knowledge graph|Paylaşılan arama ve bilgi grafiği/i },
  // Türkçe karşılıklar
  // Yasal metindeki "yapay zekâ modelleri eğitmeyiz" taahhüdü iddia değildir; ürün iddiası kalıpları aranır.
  { id: "tr-ai-words", pattern: /yapay zek[aâ]\s+(?:ile|destekli|etiket|düzenle|önerileri|tarafından)/i },
  { id: "tr-no-card", pattern: /kredi kart(?:ı|i)?\s+gerekmez/i },
  { id: "tr-staged-demo", pattern: /sahte bir demo/i },
  { id: "tr-real-time", pattern: /gerçek zamanlı/i },
  { id: "tr-entire-drive", pattern: /(?:tüm|bütün)\s+Drive|Drive['’]?(?:ın|ınızın)\s+tamamı/i },
  // 9 Kas 2026: hesapsız, ücretsiz, yerel ürün. Olumsuz cümle ("no paid plans") serbest, plan vaadi yasak.
  { id: "pro-team-plan", pattern: /\b(?:Pro|Team)\s+(?:plans?|plan[ıa]\w*|trial|tier|subscription|seats?|deneme\w*)\b|\bPro (?:and|or|ve|veya) Team\b|\bPro, Team\b|\bFree, Pro\b/ },
  { id: "free-plan", pattern: /\bfree plan\w*|ücretsiz plan\w*|\bFree plan\w*/i },
  { id: "paid-plan-offer", pattern: /\b(?:a|your|on a|to a)\s+paid\s+plan\b|plans? (?:start|renew)|ücretli planla|ücretli plan(?:a|ı|ın)\b/i },
  { id: "sign-up", pattern: /\bsign(?:ing|s|ed)?[- ]?up\b|kayıt ol(?![a-zçğıöşü])|ücretsiz kaydol/i },
  { id: "create-account", pattern: /create (?:an |your )?account|hesap oluştur/i },
  { id: "free-trial", pattern: /free trial|\b\d+[- ]day (?:Pro )?trial|ücretsiz deneme|\d+ günlük deneme/i },
  { id: "cancel-anytime", pattern: /cancel anytime|istediğiniz zaman iptal|istediğin zaman iptal edebilirsin/i },
  { id: "firebase", pattern: /firebase/i },
  { id: "firestore", pattern: /firestore/i },
  { id: "lemon-squeezy", pattern: /lemon\s*squeezy/i },
  { id: "auto-tag", pattern: /auto-?tag|otomatik etiket/i },
  { id: "tags-in-folderpls", pattern: /\b(?:tags?|labels?|notes?)\b[^.]{0,30}\b(?:live|living|lives|stored|stay|stays)\s+in\s+FolderPls|\b(?:etiket\w*|not\w*)\b[^.]{0,30}FolderPls['’]te\s+(?:durur|tutulur|saklanır)|structure lives in FolderPls/i },
  { id: "our-database", pattern: /stored in our databases?|its own database|veritabanlarımızda/i },
  { id: "auto-device-sync", pattern: /sync\w*\s+(?:automatically|across (?:all )?(?:your )?devices)|automatic\w*\s+sync|cihazlar aras[ıi] eşitle|otomatik(?:\s+olarak)?\s+eşitle/i },
];

/** Kullanıcıya görünen metin taşıyan kaynak yolları (kökten göreli, / ile). */
const VISIBLE_ROOTS = [
  "app",
  "components",
  "lib/i18n",
  "lib/marketing",
  "lib/blog",
  "lib/legal",
  "lib/seo",
];

/** API yolları ve sunucu günlükleri görünür metin değildir. */
const NOT_VISIBLE = [/(^|\/)api\//, /\.test\./];

/**
 * Bilinçli, belgeli istisnalar. Her satırın gerekçesi olmalı; şu an yok.
 * (components/dashboard/upgrade-dialog.tsx ve app/(auth)/signup/page.tsx için istisna gerekmiyor.)
 */
const ALLOWED_FILES: Record<string, string> = {};

/** Birebir, belgeli ifade istisnaları (dosya -> ifadeler). Şu an yok. */
const ALLOWED_PHRASES: Record<string, readonly string[]> = {};

export function stripAllowedPhrases(rel: string, text: string): string {
  let out = text;
  for (const phrase of ALLOWED_PHRASES[rel] ?? []) out = out.split(phrase).join(" ");
  return out;
}

export function findClaims(text: string): string[] {
  return BANNED_CLAIMS.filter((c) => c.pattern.test(text)).map((c) => c.id);
}

function scanSourceFiles(): string[] {
  const problems: string[] = [];
  for (const rootDir of VISIBLE_ROOTS) {
    for (const file of walk(path.join(ROOT, rootDir), /\.tsx?$/)) {
      const rel = path.relative(ROOT, file).split(path.sep).join("/");
      if (NOT_VISIBLE.some((re) => re.test(rel))) continue;
      if (rel in ALLOWED_FILES) continue;
      const source = readFileSync(file, "utf8");
      for (const candidate of visibleTexts(file, source)) {
        for (const id of findClaims(stripAllowedPhrases(rel, candidate.text))) {
          problems.push(`${rel}:${candidate.line}  [${id}]  ${candidate.text.trim().slice(0, 90)}`);
        }
      }
    }
  }
  return problems;
}

describe("findClaims (tarayıcının kendisi)", () => {
  it("plan listesindeki ifadeleri yakalar", () => {
    const hits: Record<string, string> = {
      "Now in Public Beta": "public-beta",
      "Opt-in AI tagging": "ai",
      "Let AI tag it": "ai",
      "turns your entire Drive into a map": "entire-drive",
      "Our intelligent search scans through your entire Google Drive": "entire-drive",
      "Full Drive Access": "full-drive",
      "Real-time Sync": "real-time",
      "Changes are synced to Drive in real time": "real-time",
      "Changes made in FolderPls are instantly reflected in Google Drive and vice versa.": "vice-versa",
      "Never.": "faq-never",
      "Asla. FolderPls, Drive klasör yapınızdan tamamen bağımsız çalışır.": "faq-never",
      "FolderPls works completely independently of your Drive folder structure.": "faq-independent-structure",
      "Not a staged demo": "staged-demo",
      "Watch Demo": "watch-demo",
      "Demoyu izle": "watch-demo",
      "Shared tags light up across teams": "across-teams",
      "Hidden file relationships surface automatically": "surface-automatically",
      "a living, breathing map": "living-breathing",
      "Teams grow, file counts explode": "file-counts-explode",
      "No credit card required": "no-card-en",
      "Free trials do not require a card": "trial-no-card-terms",
      "Kredi kartı gerekmez": "tr-no-card",
      "Most Popular": "most-popular",
      "We never move your files.": "never-move",
      "Dosyalarınızı asla taşımıyoruz.": "never-move",
      "Metadata-first. We don't move your files.": "never-move",
      "100% compatible with Google Drive.": "full-compat",
      "Google Drive ile %100 uyumlu.": "full-compat",
      "FolderPls only stores file IDs and the metadata (labels) you add.": "only-ids",
      "Pick your folder": "pick-folder",
      "Choose an existing Drive folder with the Google Picker.": "pick-folder",
      "Klasörünü seç": "pick-folder",
      "Connect your Drive folder": "pick-folder",
      "FolderPls works inside one Drive folder you choose.": "pick-folder",
      "Mevcut bir Drive klasörünü seçin — dosyalar yerinden kalmaz": "pick-folder",
      "Google Picker ile mevcut bir Drive klasörü seçersin.": "pick-folder",
      "Yapay zekâ ile etiketleme": "tr-ai-words",
      "Sahte bir demo değil": "tr-staged-demo",
      "Bu dosyalar AI ile etiketlensin mi?": "ai",
      "Pricing: Free, Pro and Team Plans": "pro-team-plan",
      "On a Team plan, teammates can see your tags.": "pro-team-plan",
      "Team planında ortak etiketler": "pro-team-plan",
      "Choose the Pro plan": "pro-team-plan",
      "Start a Pro trial": "pro-team-plan",
      "It has a free plan for personal Google accounts.": "free-plan",
      "Free planda kalırsın": "free-plan",
      "Work or school accounts use a paid plan.": "paid-plan-offer",
      "Sign up free with Google": "sign-up",
      "[Sign up](/signup) with your Google account": "sign-up",
      "before you sign up": "sign-up",
      "Google ile ücretsiz kayıt ol": "sign-up",
      "Create an account": "create-account",
      "Hesap oluştur": "create-account",
      "A 7-day free trial is available.": "free-trial",
      "How does the 14-day trial work?": "free-trial",
      "14 günlük deneme nasıl çalışıyor?": "free-trial",
      "Free for personal Google accounts • Cancel anytime": "cancel-anytime",
      "Stored in Firebase": "firebase",
      "Your labels are in Cloud Firestore": "firestore",
      "Billing by Lemon Squeezy": "lemon-squeezy",
      "Auto-tag by type, folder and date": "auto-tag",
      "Auto-tagging suggests tags": "auto-tag",
      "Tür, klasör ve tarihe göre otomatik etiket": "auto-tag",
      "Tags live in FolderPls": "tags-in-folderpls",
      "No. Tagging doesn't change your Drive folders: labels and notes live in FolderPls.": "tags-in-folderpls",
      "The tags are stored in FolderPls, not in Drive.": "tags-in-folderpls",
      "Etiket ve notlar FolderPls'te durur.": "tags-in-folderpls",
      "Labels and project data are stored in our databases.": "our-database",
      "FolderPls stores tags in its own database": "our-database",
      "Eklediğiniz etiketler veritabanlarımızda saklanır.": "our-database",
      "Your tags sync across devices": "auto-device-sync",
      "Your tags sync automatically": "auto-device-sync",
      "Etiketler cihazlar arası eşitlenir": "auto-device-sync",
    };
    for (const [text, id] of Object.entries(hits)) expect(findClaims(text), text).toContain(id);
  });

  it("zararsız metni yakalamaz (\"AI\" sözcük sınırı, \"said\", \"maintain\" gibi)", () => {
    for (const ok of [
      "Tagging never moves a file",
      "Etiketleme dosyayı taşımaz",
      "a tagging layer that never moves your files",
      "He said we maintain the list",
      "Pick what to organize",
      "Google Picker ile Drive'ından seçim yaparsın.",
      "Real-time search results as you type",
      "See how it works",
      "Never trust a file name you can't search.",
      "No. Tagging doesn't change your Drive folders: labels and notes live in your browser.",
      "Free. There are no paid plans.",
      "Ücretsiz. Ücretli plan yok.",
      "No subscription, no trial, no quotas.",
      "Use it without an account.",
      "Hesap açmadan kullanılır",
      "Team Drive (or shared drive)",
      "Sync with Drive",
      "Sync runs only when you click it.",
      "Your labels stay in your browser and never reach our servers.",
    ]) {
      expect(findClaims(ok), ok).toEqual([]);
    }
  });
});

describe("kanıtsız iddia taraması (kaynak)", () => {
  // Tarama tüm görünür kaynakları TypeScript ayrıştırıcısıyla gezer: tek başına ~0,8 sn, ama paralel çalışan
  // 100'den fazla test dosyasının altında 5 sn'lik varsayılan süreyi aşabiliyor (rebase sonrası ve taban
  // çizgisinde birer kez "Test timed out in 5000ms" görüldü). Süre sınırı genişletildi; davranış değişmedi.
  it("kullanıcıya görünen metinde yasaklı ifade yok", () => {
    expect(scanSourceFiles()).toEqual([]);
  }, 60_000);

  it("kaldırılan hesap sayfalarına iç bağlantı yok (href, blog bağlantısı)", () => {
    const problems: string[] = [];
    for (const rootDir of VISIBLE_ROOTS) {
      for (const file of walk(path.join(ROOT, rootDir), /\.tsx?$/)) {
        const rel = path.relative(ROOT, file).split(path.sep).join("/");
        if (NOT_VISIBLE.some((re) => re.test(rel))) continue;
        const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
        if (/["'`(]\/(?:signup|login|forgot-password)["'`)]/.test(code)) problems.push(rel);
      }
    }
    expect(problems).toEqual([]);
  }, 60_000);

  it("istisna listesindeki her dosya gerçekten var (bayat istisna kalmaz)", () => {
    for (const rel of Object.keys(ALLOWED_FILES)) {
      expect(() => readFileSync(path.join(ROOT, rel), "utf8"), rel).not.toThrow();
    }
  });

  it("birebir ifade istisnaları dosyada gerçekten geçiyor (bayat istisna kalmaz)", () => {
    for (const [rel, phrases] of Object.entries(ALLOWED_PHRASES)) {
      const source = readFileSync(path.join(ROOT, rel), "utf8");
      for (const phrase of phrases) expect(source.includes(phrase), `${rel}: ${phrase}`).toBe(true);
    }
  });

});
