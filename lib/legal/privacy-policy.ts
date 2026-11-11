import { CONTACT_EMAIL } from "@/lib/constants/site";
import {
  type LegalDocumentContent,
  type LegalLocale,
  callout,
  h3,
  p,
  ul,
} from "./types";

const CONTACT = CONTACT_EMAIL || "[NEXT_PUBLIC_CONTACT_EMAIL]";
import { hostingInfo } from "./hosting";

/**
 * Privacy policy, written from what the code actually processes (audited
 * 2026-11-09): no accounts and no database. Labels, notes, properties and
 * collections live in the browser's IndexedDB, one database per Google account
 * (lib/storage/account-stores.ts). Drive is reached
 * from the browser with Google Identity Services, scope `drive.file`; the
 * access token sits in sessionStorage and there is no refresh token. While Drive is connected the
 * backup is the visible `folderpls-tags.json` in the user's Drive, recognised by
 * a private `appProperties` mark rather than by name. The only
 * server route that receives visitor reports is /api/csp-report. The hosting
 * provider comes from HOSTING_PROVIDER / HOSTING_REGION (see ./hosting.ts).
 * Sentry only runs when NEXT_PUBLIC_SENTRY_DSN is set. If a new data flow is added, update BOTH
 * locales and LEGAL_LAST_UPDATED_ISO.
 *
 * The "Limited Use" paragraph is the wording Google requires for apps that use
 * Google user data (Google API Services User Data Policy). Do not paraphrase it.
 */

const USER_DATA_POLICY = "https://developers.google.com/terms/api-services-user-data-policy";
const GOOGLE_PERMISSIONS = "https://myaccount.google.com/permissions";
const GOOGLE_PRIVACY = "https://policies.google.com/privacy";

const HOST_EN = hostingInfo("en");
const HOST_TR = hostingInfo("tr");

const en: LegalDocumentContent = {
  locale: "en",
  title: "Privacy Policy",
  metaTitle: "Privacy Policy",
  metaDescription:
    "FolderPls keeps your labels in your browser and needs no account. What Google and our host see, Google Limited Use, KVKK and GDPR rights, export and delete.",
  lastUpdatedLabel: "Last updated",
  lastUpdated: "11 November 2026",
  tocLabel: "Contents",
  intro: [
    "FolderPls lets you add labels, properties and notes to your Google Drive files without moving them. It is free and open source, it has no accounts, and it runs in your browser. This policy explains which data is involved, where it sits, who else can see it, and how you can export or delete it.",
    "Short version: your files stay in your Google Drive. Your labels, notes, properties and collections stay in your browser, and, while Drive is connected, in a backup file in your own Drive. They are never sent to FolderPls servers. We never sell data or use it for advertising.",
  ],
  sections: [
    {
      id: "controller",
      title: "1. Who runs FolderPls",
      blocks: [
        p(
          `FolderPls is a free, non-profit, open-source project. This policy covers the copy of FolderPls you are using, and whoever runs that copy is responsible for it. You can reach them about anything in this policy at ${CONTACT}.`,
        ),
        p(
          "FolderPls has no user accounts and no database of user data. Your labels, notes and properties are held by your browser and your own Google account, under your control, and we cannot see them. We act as data controller only for the limited data in sections 2.5 and 2.6: hosting logs and messages you e-mail us.",
        ),
        p(
          "FolderPls is open source. If someone else runs their own copy of the code, that person is responsible for that copy, and this policy does not apply to it.",
        ),
      ],
    },
    {
      id: "data-we-process",
      title: "2. Data FolderPls handles",
      blocks: [
        h3("2.1 Data kept in your browser"),
        p("What you create in FolderPls is saved in your browser's IndexedDB storage, on the device you are using:"),
        ul(
          "The labels, label expiry dates, custom properties, notes, file relations and saved collections you create.",
          "For each file or folder you label or annotate: its Drive ID, name, item type, MIME type and parent-folder ID, so FolderPls can list it and link back to it in Drive.",
        ),
        p(
          "None of this is sent to FolderPls servers. It stays in that browser on that device. Each Google account you connect gets its own separate store in this browser, and one account's data is never written to another account's store or backup. If no account has been connected yet, data waits in a store of its own and moves once to the first account it belongs to. Another browser or device starts empty until you import a backup or connect the Google account that holds your backup file, and clearing your browser's site data deletes it.",
        ),
        h3("2.2 Google Drive data"),
        p(
          "You connect Google Drive only when you want to see your files. FolderPls requests only the drive.file scope. With it, FolderPls can only see files and folders that you explicitly select in the Google Picker, that you create or upload through FolderPls, and the backup file in section 2.4. It cannot see the rest of your Drive.",
        ),
        ul(
          "When you connect, Google shows its own consent screen. FolderPls then reads your Google display name, e-mail address and Drive user ID from the Drive API. It keeps the name and e-mail in your browser, to show which account is connected and to offer a reconnect. From the user ID it computes a one-way code that keeps each account's data apart; the ID itself is not stored. None of this is sent to us.",
          "File lists, thumbnails, previews and file contents are loaded by your browser directly from Google. They do not pass through FolderPls servers. Apart from the details in section 2.1, nothing from them is saved.",
          "Changes in Drive happen only when you ask. If you rename, copy, move, upload, create folders or delete through FolderPls, the request goes from your browser to Google Drive on your behalf.",
        ),
        h3("2.3 Google access token"),
        ul(
          "Google gives your browser a short-lived access token (about one hour). It is kept in sessionStorage for the current tab and is removed when you disconnect Drive or close the tab. When it expires, you click reconnect.",
          "FolderPls does not obtain a refresh token, and no Google token is sent to FolderPls servers.",
        ),
        h3("2.4 Backup and export"),
        ul(
          "Export downloads your data to your device as a JSON file. Import reads such a file in your browser and merges it.",
          "While Google Drive is connected, FolderPls creates and updates a visible file named folderpls-tags.json in your own Drive. It contains that account's data from section 2.1. FolderPls writes it a few seconds after your data changes, and reads it and merges it with this browser when you open the app or connect Drive. Sync with Drive does the same on demand. If you do not connect Drive, no file is written. You can open, move or delete the file in Drive like any other file.",
          "FolderPls recognises its backup by a private app property on the file (the account's one-way code), not by the file name. Google shows that property only to the same OAuth client, so a file with the same name that you pick, or that someone shares with you, is never treated as your backup. A copy of FolderPls that runs with its own OAuth client cannot see this mark; to move your data to such a copy, use Export and Import.",
        ),
        h3("2.5 Technical logs"),
        p(
          `The website is hosted by ${HOST_EN.name}. Like any web host, ${HOST_EN.name} records standard request logs (such as IP address, user agent, requested URL and time) to deliver and protect the site. If your browser blocks something under our security policy, it sends a short violation report, and we log a summary without query strings or user data.`,
        ),
        p(
          "FolderPls includes optional error reporting to Sentry that runs only if whoever operates this copy turns it on (section 5).",
        ),
        h3("2.6 If you contact us"),
        p(
          "If you e-mail us, including through the feedback window in the app, which opens your own e-mail program, we receive your address and what you write. We use it only to answer you.",
        ),
        h3("2.7 What FolderPls does not collect"),
        p(
          "FolderPls collects no account or sign-in data, no payment data, no product analytics and no page-visit counts, and it has no advertising trackers.",
        ),
      ],
    },
    {
      id: "purposes",
      title: "3. Why data is processed (purposes and legal bases)",
      blocks: [
        ul(
          "To deliver and secure the website, using hosting logs (legitimate interest; KVKK art. 5(2)(f), GDPR art. 6(1)(f)).",
          "To answer messages you send us (legitimate interest; KVKK art. 5(2)(f), GDPR art. 6(1)(f)).",
        ),
        p("Drive access happens in your browser, at your request, under the consent you give on Google's screen. It does not involve FolderPls servers."),
        p("We do not sell personal data, and we do not use it for advertising or profiling."),
      ],
    },
    {
      id: "google-limited-use",
      title: "4. Google API Services: Limited Use",
      blocks: [
        callout(
          `FolderPls's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy (${USER_DATA_POLICY}), including the Limited Use requirements.`,
        ),
        p("In particular:"),
        ul(
          "FolderPls uses Google user data only in your browser, and only to provide the features you use.",
          "Google user data is not sent to FolderPls servers, and we do not transfer it to anyone. It moves only between your browser and Google.",
          "We do not use or transfer Google user data for advertising, including retargeting or personalised or interest-based ads, and we do not sell it.",
          "Nobody at FolderPls can read your Google user data, because it does not reach us. If you choose to share some of it with us, for example in a support e-mail, we use it only to answer you.",
          "We do not use Google Workspace API data (including Google Drive data) to develop, improve or train generalised or non-personalised artificial-intelligence or machine-learning models.",
        ),
      ],
    },
    {
      id: "processors",
      title: "5. Service providers and international transfers",
      blocks: [
        p("FolderPls relies on these providers:"),
        ul(
          `Google (Google Identity Services, Google Drive API, Google Picker): connecting your Drive, showing your files and holding your backup file. Your browser talks to Google directly, under Google's own privacy policy: ${GOOGLE_PRIVACY}`,
          `${HOST_EN.name}: website hosting and server functions, including the one that logs security-policy reports${HOST_EN.region ? ` (they run in ${HOST_EN.region})` : ""}.`,
          "Sentry (Functional Software, Inc., USA): off by default. Anyone running their own copy of the code can turn on error reporting. On such a copy, reports go to Sentry's EU region (Frankfurt) and contain the error message and stack trace, the page path without query strings or fragments, browser and device type, language setting, and recent click and navigation events. Cookies, request bodies, access tokens, e-mail addresses and the file names in click traces are removed first. Sentry's servers see the IP address when a report arrives. The person running that copy is responsible for it.",
        ),
        p(
          `Google is established outside Türkiye and the European Economic Area, mainly in the USA, and the hosting provider may be too. Where personal data in hosting logs is transferred abroad, we rely on the safeguards offered by these providers (such as standard contractual clauses) in line with KVKK article 9 and GDPR chapter V.`,
        ),
      ],
    },
    {
      id: "retention",
      title: "6. How long data is kept",
      blocks: [
        ul(
          "Labels, notes, properties and collections: in your browser, separately for each Google account, until you delete them or clear its site data, and in that account's Drive backup file until you delete that file.",
          "Google access token: until it expires, you disconnect Drive or you close the tab.",
          `Hosting request logs: kept by ${HOST_EN.name} for a limited period according to its retention settings.`,
          "E-mails you send us: as long as needed to answer you and keep track of the conversation.",
          "Error reports in Sentry: none by default. On a copy that turns Sentry on, according to the settings of whoever runs it.",
        ),
      ],
    },
    {
      id: "your-controls",
      title: "7. Export, disconnect and delete in the app",
      blocks: [
        p("Open the app, then choose Data and Drive from the menu in the sidebar:"),
        ul(
          "Export: downloads your labels, notes, properties and collections as a JSON file.",
          "Disconnect Google Drive: asks Google to revoke FolderPls's access and removes the token and the account details from this browser. Your labels stay.",
          "Delete data in this browser: permanently removes the open Google account's labels, notes and collections from this browser. Other accounts' data in this browser, your Drive files and the backup file in your Drive are not touched. To remove the backup, delete folderpls-tags.json in Drive.",
        ),
        p(`You can also remove FolderPls's access at any time from your Google account: ${GOOGLE_PERMISSIONS}`),
      ],
    },
    {
      id: "rights",
      title: "8. Your rights (KVKK and GDPR)",
      blocks: [
        p(
          "Under article 11 of the Turkish Personal Data Protection Law No. 6698 (KVKK) and, where it applies, the EU General Data Protection Regulation (GDPR), you have the right to: learn whether we process your data and request information about it; access and receive a copy; have inaccurate data corrected; have data deleted; restrict or object to processing, including processing based on legitimate interest; data portability; learn the third parties it is transferred to; object to outcomes based solely on automated processing; and claim compensation for unlawful processing.",
        ),
        p(
          `The data in your browser and your Drive is already under your control (section 7), and we have no access to it. For hosting logs or messages you sent us, e-mail ${CONTACT}; we respond within 30 days. You may also complain to the Turkish Personal Data Protection Authority (KVKK) or, in the EU, to your local data protection authority.`,
        ),
      ],
    },
    {
      id: "storage",
      title: "9. Cookies and browser storage",
      blocks: [
        p(
          "FolderPls does not set advertising or cross-site tracking cookies. It uses only the browser storage the app needs: IndexedDB for your labels and related data (one store per Google account), sessionStorage for the current Drive access token, and localStorage for the connected account's name and e-mail, the one-way code of the account whose data is open, the backup status, the Drive root folder ID, your language, theme and onboarding choices, recent searches and small display preferences. This storage stays on your device. Because it is strictly necessary, no cookie consent banner is shown.",
        ),
      ],
    },
    {
      id: "security",
      title: "10. Security",
      blocks: [
        ul(
          "All traffic is encrypted with HTTPS (HSTS).",
          "Google access tokens stay in your browser tab. There are no server-side tokens.",
          "A Content Security Policy limits which other sites the app can connect to.",
          "FolderPls does not encrypt the data in your browser. Anyone who can use your browser profile can open it, so keep your device protected.",
        ),
        p("No system is perfectly secure. If we learn of a problem with the site that affects you, we will publish a notice on this page and inform the competent authorities where the law requires it."),
      ],
    },
    {
      id: "children",
      title: "11. Children",
      blocks: [
        p(
          `FolderPls is not directed at children. You must be at least 16 years old (or the age of digital consent in your country, if higher) to use it. If you believe a child has sent us personal data, contact ${CONTACT} and we will delete it.`,
        ),
      ],
    },
    {
      id: "us-residents",
      title: "12. Information for US residents (California and other states)",
      blocks: [
        p(
          "FolderPls is run by an individual developer in Türkiye and is not aimed at a particular US state. This section is a voluntary notice: it describes what we collect and what you can do in the terms US privacy laws such as the California Consumer Privacy Act (CCPA) use. It does not change the rest of this policy.",
        ),
        ul(
          "What we collect: internet activity in hosting logs (IP address, user agent, requested URL and time) and the e-mails you send us. Your labels, notes, file names and Drive file IDs stay in your browser and your Drive, and we do not collect them. Details are in section 2.",
          "Where it comes from: your browser when it requests a page, and you when you write to us.",
          `Why and who receives it: only to run FolderPls (section 3). Hosting logs are handled by ${HOST_EN.name} (section 5).`,
          "We do not sell personal information, and we do not share it for cross-context behavioral advertising. FolderPls has no advertising or cross-site trackers.",
          "How long we keep it: see section 6.",
        ),
        p(
          `Your choices: export and delete work directly in the app (section 7). For anything else, you can ask what we hold about you, get a copy, have it corrected or have it deleted by e-mailing ${CONTACT}; we respond within 30 days. We will not treat you differently for using these rights.`,
        ),
      ],
    },
    {
      id: "changes",
      title: "13. Changes to this policy",
      blocks: [
        p(
          "If we change how data is handled, we will update this page and the date at the top. FolderPls has no accounts, so we cannot contact you directly. For material changes, for example a new category of data or a new service provider, we will show a notice on this page before the change takes effect.",
        ),
      ],
    },
    {
      id: "contact",
      title: "14. Contact",
      blocks: [p(`Questions or requests about privacy: ${CONTACT}`)],
    },
  ],
};

const tr: LegalDocumentContent = {
  locale: "tr",
  title: "Gizlilik Politikası ve KVKK Aydınlatma Metni",
  metaTitle: "Gizlilik Politikası ve KVKK Aydınlatma Metni",
  metaDescription:
    "FolderPls etiketlerini tarayıcında tutar, hesap istemez. Google ve barındırıcımız neyi görür, Google Sınırlı Kullanım, KVKK, GDPR, dışa aktarma ve silme.",
  lastUpdatedLabel: "Son güncelleme",
  lastUpdated: "11 Kasım 2026",
  tocLabel: "İçindekiler",
  intro: [
    "FolderPls, Google Drive dosyalarını taşımadan onlara etiket, özellik ve not eklemeni sağlar. Ücretsiz ve açık kaynaktır, hesap sistemi yoktur, tarayıcında çalışır. Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) md. 10 kapsamındaki aydınlatma yükümlülüğü ve AB Genel Veri Koruma Tüzüğü (GDPR) uyarınca, hangi verilerin söz konusu olduğunu, nerede durduğunu, başka kimlerin görebildiğini ve onları nasıl dışa aktarıp silebileceğini açıklar.",
    "Kısaca: dosyaların Google Drive'ında kalır. Etiketlerin, notların, özelliklerin ve koleksiyonların tarayıcında durur; Drive bağlıyken kendi Drive'ındaki bir yedek dosyasında da durur. FolderPls sunucularına gönderilmez. Verileri satmayız, reklam için kullanmayız.",
  ],
  sections: [
    {
      id: "veri-sorumlusu",
      title: "1. FolderPls'i kim işletiyor",
      blocks: [
        p(
          `FolderPls ücretsiz, kar amacı gütmeyen ve açık kaynak bir projedir. Bu politika kullandığın FolderPls kopyası için geçerlidir ve o kopyadan onu işleten kişi sorumludur. Bu politikayla ilgili her konuda ${CONTACT} adresinden bize ulaşabilirsin.`,
        ),
        p(
          "FolderPls'in hesap sistemi ve kullanıcı verisi tutan bir veritabanı yoktur. Etiketlerin, notların ve özelliklerin senin kontrolünde, tarayıcında ve kendi Google hesabında durur; biz onları göremeyiz. Yalnız 2.5 ve 2.6 bölümlerindeki sınırlı veriler için veri sorumlusuyuz: barındırma kayıtları ve bize yazdığın e-postalar.",
        ),
        p(
          "FolderPls açık kaynaktır. Kodun bir kopyasını başka biri çalıştırıyorsa o kopyadan o kişi sorumludur ve bu politika o kopya için geçerli olmaz.",
        ),
      ],
    },
    {
      id: "islenen-veriler",
      title: "2. FolderPls'in işlediği veriler",
      blocks: [
        h3("2.1 Tarayıcında tutulan veriler"),
        p("FolderPls'te oluşturdukların, kullandığın cihazda tarayıcının IndexedDB alanına kaydedilir:"),
        ul(
          "Oluşturduğun etiketler, etiket bitiş tarihleri, özel özellikler, notlar, dosya ilişkileri ve kayıtlı koleksiyonlar.",
          "Etiketlediğin veya not eklediğin her dosya ya da klasör için: Drive kimliği, adı, öğe türü, MIME türü ve üst klasör kimliği. FolderPls bunlarla dosyayı listeler ve Drive'daki yerine bağlantı verir.",
        ),
        p(
          "Bunların hiçbiri FolderPls sunucularına gönderilmez. O cihazdaki o tarayıcıda kalır. Bağladığın her Google hesabının bu tarayıcıda ayrı bir deposu olur; bir hesabın verisi başka hesabın deposuna ya da yedeğine hiç yazılmaz. Henüz hesap bağlanmadıysa veriler kendi deposunda bekler ve ait olduğu ilk hesaba bir kez taşınır. Başka bir tarayıcı veya cihaz, yedek içe aktarana ya da yedek dosyanın bulunduğu Google hesabını bağlayana kadar boş başlar; tarayıcının site verilerini temizlersen silinir.",
        ),
        h3("2.2 Google Drive verileri"),
        p(
          "Google Drive'ı yalnız dosyalarını görmek istediğinde bağlarsın. FolderPls yalnız drive.file yetkisini ister. Bu yetkiyle FolderPls yalnız Google Picker'da açıkça seçtiğin, FolderPls üzerinden oluşturduğun ya da yüklediğin dosya ve klasörleri ve 2.4 bölümündeki yedek dosyasını görebilir; Drive'ının geri kalanını göremez.",
        ),
        ul(
          "Bağlanırken Google kendi onay ekranını gösterir. FolderPls ardından Google görünen adını, e-posta adresini ve Drive kullanıcı kimliğini Drive API'den okur. Adı ve e-postayı, hangi hesabın bağlı olduğunu göstermek ve yeniden bağlanmayı önermek için tarayıcında tutar. Kullanıcı kimliğinden, her hesabın verisini ayrı tutan tek yönlü bir kod hesaplar; kimliğin kendisi saklanmaz. Bunların hiçbiri bize gönderilmez.",
          "Dosya listeleri, küçük resimler, önizlemeler ve dosya içerikleri tarayıcın tarafından doğrudan Google'dan yüklenir; FolderPls sunucularından geçmez. 2.1 bölümündeki bilgiler dışında bunlardan hiçbir şey kaydedilmez.",
          "Drive'daki değişiklikler yalnız sen istediğinde olur. FolderPls üzerinden yeniden adlandırma, kopyalama, taşıma, yükleme, klasör oluşturma veya silme yaparsan istek senin adına tarayıcından Google Drive'a gider.",
        ),
        h3("2.3 Google erişim anahtarı"),
        ul(
          "Google, tarayıcına kısa ömürlü (yaklaşık bir saatlik) bir erişim anahtarı verir. Anahtar yalnız o sekme için sessionStorage alanında tutulur; Drive bağlantısını kestiğinde veya sekmeyi kapattığında silinir. Süresi dolunca yeniden bağlan düğmesine tıklarsın.",
          "FolderPls yenileme anahtarı (refresh token) almaz; hiçbir Google anahtarı FolderPls sunucularına gönderilmez.",
        ),
        h3("2.4 Yedek ve dışa aktarma"),
        ul(
          "Dışa aktarma, verilerini JSON dosyası olarak cihazına indirir. İçe aktarma böyle bir dosyayı tarayıcında okur ve birleştirir.",
          "Google Drive bağlıyken FolderPls kendi Drive'ında folderpls-tags.json adlı görünür bir dosya oluşturur ve günceller. Dosya, o hesabın 2.1 bölümündeki verilerini içerir. FolderPls verilerin değiştikten birkaç saniye sonra dosyaya yazar; uygulamayı açtığında ya da Drive'ı bağladığında dosyayı okuyup bu tarayıcıdakilerle birleştirir. Drive ile eşitle düğmesi aynı işi istediğin anda yapar. Drive'ı bağlamazsan dosya yazılmaz. Dosyayı Drive'da diğer dosyalar gibi açabilir, taşıyabilir veya silebilirsin.",
          "FolderPls yedeğini dosya adından değil, dosyadaki uygulamaya özel bir işaretten (hesabın tek yönlü kodu) tanır. Google bu işareti yalnız aynı OAuth istemcisine gösterir; bu yüzden Picker'da seçtiğin ya da biri seninle paylaştığı aynı adlı bir dosya yedeğin sayılmaz. Kendi OAuth istemcisiyle çalışan başka bir FolderPls kopyası bu işareti göremez; verini böyle bir kopyaya taşımak için Dışa aktar ve İçe aktar'ı kullan.",
        ),
        h3("2.5 Teknik kayıtlar"),
        p(
          `Web sitesi ${HOST_TR.name} tarafından barındırılır. Her web barındırıcısı gibi ${HOST_TR.name} de siteyi sunmak ve korumak için standart istek kayıtları (IP adresi, tarayıcı bilgisi, istenen adres ve zaman gibi) tutar. Tarayıcın güvenlik politikamız gereği bir şeyi engellerse kısa bir ihlal raporu gönderir; biz bunun sorgu dizesi ve kullanıcı verisi içermeyen özetini kaydederiz.`,
        ),
        p(
          "Kaynak kodda Sentry'ye isteğe bağlı bir hata raporlama vardır; yalnız bu kopyayı işleten kişi açarsa çalışır (bölüm 5).",
        ),
        h3("2.6 Bize yazarsan"),
        p(
          "Bize e-posta gönderirsen (uygulamadaki geri bildirim penceresi de kendi e-posta programını açar) adresin ve yazdıkların bize ulaşır. Bunları yalnız sana cevap vermek için kullanırız.",
        ),
        h3("2.7 FolderPls'in toplamadıkları"),
        p(
          "FolderPls hesap ya da giriş verisi, ödeme verisi, ürün analitiği ve sayfa ziyareti sayımı toplamaz; reklam izleyicisi yoktur.",
        ),
      ],
    },
    {
      id: "amaclar",
      title: "3. İşleme amaçları ve hukuki sebepler",
      blocks: [
        ul(
          "Web sitesini sunmak ve güvenliğini sağlamak için barındırma kayıtları (meşru menfaat; KVKK md. 5/2-f, GDPR md. 6/1-f).",
          "Bize yazdığın mesajlara cevap vermek (meşru menfaat; KVKK md. 5/2-f, GDPR md. 6/1-f).",
        ),
        p("Drive erişimi senin isteğinle, tarayıcında ve Google ekranında verdiğin onayla gerçekleşir. FolderPls sunucuları bu işe dahil olmaz."),
        p("Kişisel verileri satmayız; reklam veya profilleme amacıyla kullanmayız."),
      ],
    },
    {
      id: "google-sinirli-kullanim",
      title: "4. Google API Hizmetleri: Sınırlı Kullanım (Limited Use)",
      blocks: [
        callout(
          `FolderPls's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy (${USER_DATA_POLICY}), including the Limited Use requirements.`,
        ),
        p(
          "Türkçesi: FolderPls'in Google API'lerinden aldığı bilgileri kullanması ve başka bir uygulamaya aktarması, Sınırlı Kullanım (Limited Use) gereklilikleri dahil olmak üzere Google API Hizmetleri Kullanıcı Verileri Politikası'na uygun olacaktır. Bu şu anlama gelir:",
        ),
        ul(
          "FolderPls, Google kullanıcı verilerini yalnız tarayıcında ve yalnız kullandığın özellikleri sunmak için kullanır.",
          "Google kullanıcı verileri FolderPls sunucularına gönderilmez ve kimseye aktarmayız. Bu veriler yalnız tarayıcın ile Google arasında gidip gelir.",
          "Google kullanıcı verilerini yeniden hedefleme, kişiselleştirilmiş veya ilgi alanına dayalı reklamlar dahil hiçbir reklam amacıyla kullanmaz, aktarmaz ve satmayız.",
          "FolderPls'te hiç kimse Google kullanıcı verilerini okuyamaz, çünkü bu veriler bize ulaşmaz. Bir kısmını bizimle kendin paylaşırsan (ör. destek e-postasında) yalnız sana cevap vermek için kullanırız.",
          "Google Workspace API verilerini (Google Drive verileri dahil) genel amaçlı veya kişiselleştirilmemiş yapay zekâ ve/veya makine öğrenmesi modellerini geliştirmek, iyileştirmek ya da eğitmek için kullanmayız.",
        ),
      ],
    },
    {
      id: "aktarim",
      title: "5. Hizmet sağlayıcılar ve yurt dışına aktarım",
      blocks: [
        p("FolderPls şu sağlayıcılara dayanır:"),
        ul(
          `Google (Google Identity Services, Google Drive API, Google Picker): Drive'ını bağlamak, dosyalarını göstermek ve yedek dosyanı tutmak. Tarayıcın Google ile doğrudan konuşur ve Google'ın kendi gizlilik politikası geçerlidir: ${GOOGLE_PRIVACY}`,
          `${HOST_TR.name}: web sitesi barındırma ve güvenlik politikası raporlarını kaydeden fonksiyon dahil sunucu fonksiyonları${HOST_TR.region ? ` (sunucuların yeri: ${HOST_TR.region})` : ""}.`,
          "Sentry (Functional Software, Inc., ABD): varsayılan olarak kapalıdır. Kodun kendi kopyasını çalıştıran herkes hata raporlamayı açabilir. Böyle bir kopyada raporlar Sentry'nin AB bölgesine (Frankfurt) gider ve şunları içerir: hata iletisi ve yığın izi, sorgu dizesi ve fragment olmadan sayfa yolu, tarayıcı ve cihaz türü, dil ayarı, son tıklama ve gezinti olayları. Çerezler, istek gövdeleri, erişim anahtarları, e-posta adresleri ve tıklama izlerindeki dosya adları önce çıkarılır. Rapor ulaştığında Sentry sunucuları IP adresini görür. O kopyadan onu çalıştıran kişi sorumludur.",
        ),
        p(
          `Google, Türkiye ve Avrupa Ekonomik Alanı dışında, ağırlıklı olarak ABD'de yerleşiktir; barındırma sağlayıcısı da öyle olabilir. Barındırma kayıtlarındaki kişisel verilerin yurt dışına aktarıldığı durumlarda KVKK md. 9 ve GDPR V. bölüm uyarınca bu sağlayıcıların sunduğu güvencelere (standart sözleşme hükümleri gibi) dayanırız.`,
        ),
      ],
    },
    {
      id: "saklama",
      title: "6. Saklama süreleri",
      blocks: [
        ul(
          "Etiketler, notlar, özellikler ve koleksiyonlar: sen silene ya da site verilerini temizleyene kadar tarayıcında, her Google hesabı için ayrı; yedek dosyası silinene kadar o hesabın Drive'ında.",
          "Google erişim anahtarı: süresi dolana, Drive bağlantısını kesene ya da sekmeyi kapatana kadar.",
          `Barındırma istek kayıtları: barındırma sağlayıcısının (${HOST_TR.name}) saklama ayarlarına göre sınırlı bir süre.`,
          "Bize yazdığın e-postalar: sana cevap vermek ve yazışmayı takip etmek için gerektiği kadar.",
          "Sentry'deki hata raporları: varsayılan olarak yok. Sentry'yi açan bir kopyada, onu işleten kişinin ayarlarına göre.",
        ),
      ],
    },
    {
      id: "kontroller",
      title: "7. Uygulama içinde dışa aktarma, bağlantıyı kesme ve silme",
      blocks: [
        p("Uygulamayı aç, kenar çubuğundaki menüden Veri ve Drive'ı seç:"),
        ul(
          "Dışa aktar: etiketlerini, notlarını, özelliklerini ve koleksiyonlarını JSON dosyası olarak indirir.",
          "Google Drive bağlantısını kes: Google'dan FolderPls erişimini iptal etmesini ister, anahtarı ve hesap bilgilerini bu tarayıcıdan kaldırır. Etiketlerin kalır.",
          "Bu tarayıcıdaki verileri sil: açık Google hesabının etiketlerini, notlarını ve koleksiyonlarını bu tarayıcıdan kalıcı olarak kaldırır. Bu tarayıcıdaki diğer hesapların verisine, Drive'daki dosyalarına ve Drive'daki yedek dosyana dokunulmaz. Yedeği kaldırmak için Drive'da folderpls-tags.json dosyasını sil.",
        ),
        p(`FolderPls erişimini dilediğin zaman Google hesabından da kaldırabilirsin: ${GOOGLE_PERMISSIONS}`),
      ],
    },
    {
      id: "haklariniz",
      title: "8. Hakların (KVKK md. 11 ve GDPR)",
      blocks: [
        p(
          "KVKK md. 11 ve uygulandığı ölçüde GDPR uyarınca; kişisel verilerinin işlenip işlenmediğini öğrenme ve buna ilişkin bilgi talep etme, işleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini isteme, silinmesini veya yok edilmesini isteme, bu işlemlerin aktarıldığı üçüncü kişilere bildirilmesini isteme, münhasıran otomatik sistemlerle analiz edilmesi sonucu aleyhine bir sonuç çıkmasına itiraz etme, kanuna aykırı işleme sebebiyle zarara uğraman halinde zararın giderilmesini talep etme haklarına; GDPR kapsamında ayrıca veri taşınabilirliği ve işlemenin kısıtlanması haklarına sahipsin.",
        ),
        p(
          `Tarayıcındaki ve Drive'ındaki veriler zaten senin kontrolündedir (bölüm 7), bizim erişimimiz yoktur. Barındırma kayıtları veya bize yazdığın mesajlar için ${CONTACT} adresine yaz; en geç 30 gün içinde yanıtlarız. Kişisel Verileri Koruma Kurulu'na veya AB'de bulunuyorsan yerel veri koruma otoritene şikâyette bulunma hakkın saklıdır.`,
        ),
      ],
    },
    {
      id: "cerezler",
      title: "9. Çerezler ve tarayıcı depolaması",
      blocks: [
        p(
          "FolderPls reklam veya siteler arası izleme çerezi koymaz. Yalnız uygulamanın ihtiyaç duyduğu tarayıcı depolamasını kullanır: etiketlerin ve ilgili veriler için IndexedDB (her Google hesabı için ayrı depo), geçerli Drive erişim anahtarı için sessionStorage; bağlı hesabın adı ve e-postası, verisi açık olan hesabın tek yönlü kodu, yedek durumu, Drive kök klasör kimliği, dil, tema ve tanıtım tercihlerin, son aramaların ve küçük görünüm tercihleri için localStorage. Bu depolama cihazında kalır. Zorunlu olduğundan çerez onay bandı gösterilmez.",
        ),
      ],
    },
    {
      id: "guvenlik",
      title: "10. Güvenlik",
      blocks: [
        ul(
          "Tüm trafik HTTPS (HSTS) ile şifrelenir.",
          "Google erişim anahtarları tarayıcı sekmende kalır. Sunucuda anahtar tutulmaz.",
          "İçerik Güvenliği Politikası (CSP), uygulamanın hangi sitelere bağlanabileceğini sınırlar.",
          "FolderPls tarayıcındaki verileri şifrelemez. Tarayıcı profilini kullanabilen biri bu verileri açabilir, bu yüzden cihazını koru.",
        ),
        p("Hiçbir sistem kusursuz değildir. Siteyle ilgili seni etkileyen bir sorun öğrenirsek bu sayfada duyururuz ve mevzuatın gerektirdiği durumlarda yetkili makamları bilgilendiririz."),
      ],
    },
    {
      id: "cocuklar",
      title: "11. Çocuklar",
      blocks: [
        p(
          `FolderPls çocuklara yönelik değildir. Kullanmak için en az 16 yaşında (ülkendeki dijital rıza yaşı daha yüksekse o yaşta) olmalısın. Bir çocuğun bize kişisel veri gönderdiğini düşünüyorsan ${CONTACT} adresine yaz, veriyi sileriz.`,
        ),
      ],
    },
    {
      id: "abd-sakinleri",
      title: "12. ABD'de yaşayanlar için bilgi (Kaliforniya ve diğer eyaletler)",
      blocks: [
        p(
          "FolderPls Türkiye'de yaşayan bireysel bir geliştirici tarafından işletilir ve belirli bir ABD eyaletine yönelik değildir. Bu bölüm gönüllü bir bilgilendirmedir: Kaliforniya Tüketici Gizliliği Yasası (CCPA) gibi ABD gizlilik yasalarının kullandığı terimlerle neleri topladığımızı ve neler yapabileceğini anlatır. Politikanın geri kalanını değiştirmez.",
        ),
        ul(
          "Topladıklarımız: barındırma kayıtlarındaki internet etkinliği (IP adresi, tarayıcı bilgisi, istenen adres ve zaman) ve bize yazdığın e-postalar. Etiketlerin, notların, dosya adların ve Drive dosya kimliklerin tarayıcında ve Drive'ında kalır, bunları toplamayız. Ayrıntılar bölüm 2'de.",
          "Nereden geldiği: sayfa istediğinde tarayıcından, bize yazdığında senden.",
          `Neden ve kimlerin aldığı: yalnız FolderPls'i işletmek için (bölüm 3). Barındırma kayıtlarını ${HOST_TR.name} işler (bölüm 5).`,
          "Kişisel bilgileri satmayız ve çapraz bağlamlı davranışsal reklam için paylaşmayız. FolderPls'te reklam ya da siteler arası izleyici yoktur.",
          "Ne kadar süre saklandığı: bölüm 6.",
        ),
        p(
          `Seçeneklerin: dışa aktarma ve silme doğrudan uygulamada çalışır (bölüm 7). Başka her şey için, sana dair neyi tuttuğumuzu sormak, bir kopyasını almak, düzeltilmesini veya silinmesini istemek üzere ${CONTACT} adresine yaz; 30 gün içinde yanıtlarız. Bu hakları kullandığın için sana farklı davranmayız.`,
        ),
      ],
    },
    {
      id: "degisiklikler",
      title: "13. Bu politikadaki değişiklikler",
      blocks: [
        p(
          "Verilerin işlenme biçimini değiştirirsek bu sayfayı ve üstteki tarihi güncelleriz. FolderPls'in hesap sistemi olmadığı için sana doğrudan ulaşamayız. Yeni bir veri kategorisi veya yeni bir hizmet sağlayıcı gibi önemli değişiklikleri, yürürlüğe girmeden önce bu sayfada duyururuz.",
        ),
      ],
    },
    {
      id: "iletisim",
      title: "14. İletişim",
      blocks: [p(`Gizlilikle ilgili soru ve taleplerin için: ${CONTACT}`)],
    },
  ],
};

export const PRIVACY_POLICY: Record<LegalLocale, LegalDocumentContent> = { en, tr };
