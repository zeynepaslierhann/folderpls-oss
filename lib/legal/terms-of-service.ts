import { CONTACT_EMAIL } from "@/lib/constants/site";
import { type LegalDocumentContent, type LegalLocale, h3, p, ul } from "./types";

const CONTACT = CONTACT_EMAIL || "[NEXT_PUBLIC_CONTACT_EMAIL]";

/**
 * Terms of Service, rewritten 2026-11-09 for the free, MIT-licensed, local-first
 * app: no accounts, no fees, no server-side user data (see privacy-policy.ts).
 * Liability limits and indemnification carry over from the January 2026 version,
 * with the fee-based cap removed. Have a lawyer review the wording if the
 * service model changes.
 */

const en: LegalDocumentContent = {
  locale: "en",
  title: "Terms of Service",
  metaTitle: "Terms of Service",
  metaDescription:
    "The terms for using FolderPls: free and open source, no accounts, Google Drive access with the drive.file scope, local data and backups, and liability.",
  lastUpdatedLabel: "Last updated",
  lastUpdated: "11 November 2026",
  tocLabel: "Contents",
  intro: [
    "These Terms of Service (\"Terms\") are an agreement between you and the person or organization that runs this copy of FolderPls (\"FolderPls\", \"we\", \"us\"). By using FolderPls you accept these Terms and acknowledge our Privacy Policy. If you do not agree, do not use FolderPls.",
  ],
  sections: [
    {
      id: "service",
      title: "1. The service",
      blocks: [
        p(
          "FolderPls lets you add labels, properties, notes and relations to your Google Drive files and folders, and search and filter by them. Tagging does not move or change the files themselves.",
        ),
        p("FolderPls does not store your file contents or your labels on a server. Your files stay in your Google Drive. Your labels stay in your browser, and, while Drive is connected, in a backup file in your own Drive."),
      ],
    },
    {
      id: "using",
      title: "2. Using FolderPls",
      blocks: [
        ul(
          "FolderPls has no accounts. You open the app and use it.",
          "To connect Google Drive you need a Google account, and you must be at least 16 years old (or the age of digital consent in your country, if higher).",
          "You are responsible for keeping your device, your browser and your Google account secure.",
        ),
      ],
    },
    {
      id: "google-drive",
      title: "3. Google Drive access",
      blocks: [
        p(
          "FolderPls uses the Google drive.file permission. It can only access files and folders you select in the Google Picker or create or upload through FolderPls, including its backup file. Within those, FolderPls reads metadata to display and search your files and, only when you ask it to, renames, copies, moves, uploads, creates or deletes items on your behalf.",
        ),
        p(
          "You can disconnect Google Drive or revoke FolderPls in your Google account at any time. Your use of Google Drive remains subject to Google's own terms and privacy policy.",
        ),
      ],
    },
    {
      id: "local-data",
      title: "4. Your data and backups",
      blocks: [
        ul(
          "Your labels and notes are stored only in the browser where you created them. If you clear that browser's site data, change browser or lose the device, they are gone unless you have a backup. We cannot recover them, because we never have a copy.",
          "You can export your data to a JSON file from the app. While Google Drive is connected, FolderPls also writes it to a file in your own Drive a few seconds after a change. If the connection ends, changes wait in your browser until you reconnect. Keeping backups is up to you.",
        ),
      ],
    },
    {
      id: "free",
      title: "5. Free of charge",
      blocks: [
        p("FolderPls is free. There are no paid plans, subscriptions, trials or quotas, and we never ask for payment details."),
      ],
    },
    {
      id: "open-source",
      title: "6. Open source",
      blocks: [
        p(
          "The FolderPls source code is released under the MIT License, which sets out what you can do with the code, including running your own copy. These Terms apply to the copy of FolderPls you are using. If you run your own copy, you are responsible for it and for how it handles other people's data.",
        ),
      ],
    },
    {
      id: "acceptable-use",
      title: "7. Acceptable use",
      blocks: [
        p("You agree not to:"),
        ul(
          "break the law or infringe others' rights, including intellectual property rights;",
          "attempt to access other people's data, or probe, scan or bypass the security of the hosted site;",
          "interfere with or overload the hosted site.",
        ),
      ],
    },
    {
      id: "content",
      title: "8. Your content and our rights",
      blocks: [
        p(
          "You keep all rights to your files and to the labels, notes and other metadata you create. These Terms give us no rights over them.",
        ),
        p("The FolderPls name and logo belong to us. The MIT License covers the code and gives no rights to the name or logo."),
      ],
    },
    {
      id: "termination",
      title: "9. Ending the agreement",
      blocks: [
        p(
          "You can stop using FolderPls at any time. To remove your data, use Delete data in this browser in the app, delete the backup file from your Drive if there is one, and revoke FolderPls in your Google account. The other files in your Google Drive are not touched.",
        ),
        p(
          "We may block access to the hosted site for anyone who seriously or repeatedly breaks these Terms, or if required by law.",
        ),
      ],
    },
    {
      id: "availability",
      title: "10. Availability and changes to the service",
      blocks: [
        p(
          "FolderPls is a free, non-profit project. We work to keep it available and reliable but cannot guarantee uninterrupted or error-free operation. We may change, suspend or discontinue features or the hosted site. If we shut down the hosted site, we will give reasonable notice on the site so you can export your data.",
        ),
      ],
    },
    {
      id: "liability",
      title: "11. Disclaimers and liability",
      blocks: [
        p(
          "FolderPls is provided \"as is\" and \"as available\". To the extent permitted by law, we are not liable for indirect, incidental, special or consequential damages, or for loss of profits, data or use.",
        ),
        p(
          "Our total liability for any claim relating to FolderPls is limited to USD 100. Nothing in these Terms limits liability that cannot be limited by law, such as liability for gross negligence or intent, or your mandatory consumer rights.",
        ),
        h3("Indemnification"),
        p(
          "If you use FolderPls in breach of these Terms or the law and a third party brings a claim against us as a result, you agree to cover the reasonable costs of that claim, to the extent permitted by law.",
        ),
      ],
    },
    {
      id: "changes",
      title: "12. Changes to these Terms",
      blocks: [
        p(
          "We may update these Terms. FolderPls has no accounts, so we cannot contact you directly. We will publish material changes on this page at least 14 days before they take effect. If you do not agree, stop using FolderPls before then; continuing to use it afterwards means you accept the updated Terms.",
        ),
      ],
    },
    {
      id: "law",
      title: "13. Governing law",
      blocks: [
        p(
          "These Terms are governed by the laws of the Republic of Türkiye. If you are a consumer, you also keep the protection of the mandatory laws of your country of residence and may bring claims before the courts or consumer arbitration committees competent for your place of residence.",
        ),
      ],
    },
    {
      id: "contact",
      title: "14. Contact",
      blocks: [p(`Questions about these Terms: ${CONTACT}`)],
    },
  ],
};

const tr: LegalDocumentContent = {
  locale: "tr",
  title: "Kullanım Şartları",
  metaTitle: "Kullanım Şartları",
  metaDescription:
    "FolderPls kullanım şartları: ücretsiz ve açık kaynak, hesap yok, drive.file yetkisiyle Google Drive erişimi, yerel veri ve yedekler, sorumluluk.",
  lastUpdatedLabel: "Son güncelleme",
  lastUpdated: "11 Kasım 2026",
  tocLabel: "İçindekiler",
  intro: [
    "Bu Kullanım Şartları (\"Şartlar\"), seninle FolderPls'in bu kopyasını işleten kişi ya da kuruluş (\"FolderPls\", \"biz\") arasındaki sözleşmedir. FolderPls'i kullanarak bu Şartları kabul etmiş ve Gizlilik Politikamızı okuduğunu beyan etmiş olursun. Kabul etmiyorsan FolderPls'i kullanma.",
  ],
  sections: [
    {
      id: "hizmet",
      title: "1. Hizmet",
      blocks: [
        p(
          "FolderPls, Google Drive dosya ve klasörlerine etiket, özellik, not ve ilişki eklemeni, bunlarla arama ve filtreleme yapmanı sağlar. Etiketleme dosyaların kendisini taşımaz veya değiştirmez.",
        ),
        p("FolderPls dosya içeriklerini ve etiketlerini sunucuda saklamaz. Dosyaların Google Drive'ında kalır. Etiketlerin tarayıcında durur; Drive bağlıyken kendi Drive'ındaki bir yedek dosyasında da durur."),
      ],
    },
    {
      id: "kullanim",
      title: "2. FolderPls'i kullanmak",
      blocks: [
        ul(
          "FolderPls'te hesap yoktur. Uygulamayı açar, kullanırsın.",
          "Google Drive'ı bağlamak için bir Google hesabın olmalı ve en az 16 yaşında (ülkendeki dijital rıza yaşı daha yüksekse o yaşta) olmalısın.",
          "Cihazının, tarayıcının ve Google hesabının güvenliğinden sen sorumlusun.",
        ),
      ],
    },
    {
      id: "google-drive",
      title: "3. Google Drive erişimi",
      blocks: [
        p(
          "FolderPls, Google drive.file iznini kullanır. Yalnız Google Picker'da seçtiğin ya da FolderPls üzerinden oluşturduğun veya yüklediğin dosya ve klasörlere, bu arada yedek dosyasına erişebilir. Bunlar içinde dosyalarını göstermek ve aramak için metadata okur; yalnız sen istediğinde senin adına yeniden adlandırma, kopyalama, taşıma, yükleme, oluşturma veya silme yapar.",
        ),
        p(
          "Google Drive bağlantısını dilediğin zaman kesebilir veya Google hesabından FolderPls erişimini iptal edebilirsin. Google Drive kullanımın Google'ın kendi şartlarına ve gizlilik politikasına tabidir.",
        ),
      ],
    },
    {
      id: "yerel-veri",
      title: "4. Verilerin ve yedekler",
      blocks: [
        ul(
          "Etiketlerin ve notların yalnız onları oluşturduğun tarayıcıda durur. O tarayıcının site verilerini temizlersen, tarayıcı değiştirirsen ya da cihazı kaybedersen yedeğin yoksa kaybolur. Bizde kopyası olmadığı için geri getiremeyiz.",
          "Uygulamadan verilerini JSON dosyasına aktarabilirsin. Google Drive bağlıyken FolderPls verilerini değişiklikten birkaç saniye sonra kendi Drive'ındaki bir dosyaya da yazar. Bağlantı biterse değişiklikler sen yeniden bağlanana kadar tarayıcında bekler. Yedek almak senin sorumluluğundadır.",
        ),
      ],
    },
    {
      id: "ucretsiz",
      title: "5. Ücretsizdir",
      blocks: [
        p("FolderPls ücretsizdir. Ücretli plan, abonelik, deneme süresi veya kota yoktur; ödeme bilgisi istemeyiz."),
      ],
    },
    {
      id: "acik-kaynak",
      title: "6. Açık kaynak",
      blocks: [
        p(
          "FolderPls kaynak kodu MIT Lisansı ile yayımlanır; kendi kopyanı çalıştırmak dahil kodla neler yapabileceğini bu lisans belirler. Bu Şartlar kullandığın FolderPls kopyası için geçerlidir. Kendi kopyanı çalıştırıyorsan o kopyadan ve başkalarının verilerini nasıl işlediğinden sen sorumlusun.",
        ),
      ],
    },
    {
      id: "kabul-edilebilir-kullanim",
      title: "7. Kabul edilebilir kullanım",
      blocks: [
        p("Şunları yapmamayı kabul edersin:"),
        ul(
          "hukuka aykırı davranmak veya fikri mülkiyet dahil başkalarının haklarını ihlal etmek;",
          "başkalarının verilerine erişmeye çalışmak, barındırılan sitenin güvenlik önlemlerini yoklamak, taramak veya aşmak;",
          "barındırılan sitenin işleyişini bozmak veya siteyi aşırı yüklemek.",
        ),
      ],
    },
    {
      id: "icerik",
      title: "8. İçeriğin ve haklarımız",
      blocks: [
        p(
          "Dosyaların ve oluşturduğun etiket, not ve diğer metadata üzerindeki tüm haklar sana aittir. Bu Şartlar bize bunlar üzerinde hiçbir hak vermez.",
        ),
        p("FolderPls adı ve logosu bize aittir. MIT Lisansı kodu kapsar, ad ve logo üzerinde hak vermez."),
      ],
    },
    {
      id: "sona-erme",
      title: "9. Sözleşmenin sona ermesi",
      blocks: [
        p(
          "FolderPls'i kullanmayı dilediğin zaman bırakabilirsin. Verilerini kaldırmak için uygulamada Bu tarayıcıdaki verileri sil seçeneğini kullan, yedek dosyası varsa Drive'ından sil ve Google hesabından FolderPls erişimini iptal et. Google Drive'ındaki diğer dosyalara dokunulmaz.",
        ),
        p(
          "Bu Şartları ciddi veya tekrarlayan biçimde ihlal edenlerin ya da kanunen gerekli olduğunda barındırılan siteye erişimini engelleyebiliriz.",
        ),
      ],
    },
    {
      id: "erisilebilirlik",
      title: "10. Hizmetin sürekliliği ve değişiklikler",
      blocks: [
        p(
          "FolderPls ücretsiz ve kar amacı gütmeyen bir projedir. Erişilebilir ve güvenilir tutmaya çalışırız ama kesintisiz veya hatasız çalışmayı garanti edemeyiz. Özellikleri veya barındırılan siteyi değiştirebilir, askıya alabilir ya da sonlandırabiliriz. Barındırılan siteyi kapatırsak verilerini dışa aktarabilmen için sitede makul bir süre önce haber veririz.",
        ),
      ],
    },
    {
      id: "sorumluluk",
      title: "11. Sorumluluğun sınırlandırılması",
      blocks: [
        p(
          "FolderPls \"olduğu gibi\" ve \"mevcut olduğu şekliyle\" sunulur. Kanunun izin verdiği ölçüde dolaylı, arızi, özel veya sonuç olarak doğan zararlardan ya da kâr, veri veya kullanım kaybından sorumlu değiliz.",
        ),
        p(
          "FolderPls ile ilgili her türlü talepte toplam sorumluluğumuz 100 ABD doları ile sınırlıdır. Bu Şartlardaki hiçbir hüküm, ağır kusur veya kast gibi kanunen sınırlanamayan sorumluluğu ya da emredici tüketici haklarını sınırlamaz.",
        ),
        h3("Tazmin"),
        p(
          "FolderPls'i bu Şartlara veya hukuka aykırı kullanman nedeniyle üçüncü bir kişi bize karşı talepte bulunursa, bu talebin makul masraflarını kanunun izin verdiği ölçüde karşılamayı kabul edersin.",
        ),
      ],
    },
    {
      id: "sart-degisiklikleri",
      title: "12. Şartlardaki değişiklikler",
      blocks: [
        p(
          "Bu Şartları güncelleyebiliriz. FolderPls'in hesap sistemi olmadığı için sana doğrudan ulaşamayız. Önemli değişiklikleri yürürlüğe girmeden en az 14 gün önce bu sayfada yayımlarız. Kabul etmiyorsan bu süre içinde FolderPls'i kullanmayı bırak; sonrasında kullanmaya devam etmen güncel Şartları kabul ettiğin anlamına gelir.",
        ),
      ],
    },
    {
      id: "uygulanacak-hukuk",
      title: "13. Uygulanacak hukuk",
      blocks: [
        p(
          "Bu Şartlara Türkiye Cumhuriyeti hukuku uygulanır. Tüketiciysen yerleşim yerindeki emredici hukukun korumasından yararlanmaya devam eder, taleplerini yerleşim yerindeki yetkili tüketici hakem heyeti veya tüketici mahkemesine götürebilirsin.",
        ),
      ],
    },
    {
      id: "iletisim",
      title: "14. İletişim",
      blocks: [p(`Bu Şartlarla ilgili soruların için: ${CONTACT}`)],
    },
  ],
};

export const TERMS_OF_SERVICE: Record<LegalLocale, LegalDocumentContent> = { en, tr };
