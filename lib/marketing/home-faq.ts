/**
 * Ana sayfa SSS (sık sorulan sorular) — TEK kaynak.
 *
 * Hem görünen bölüm (`components/landing/faq.tsx`) hem de arama motorlarına
 * giden FAQPage JSON-LD'si (`components/seo/faq-schema.tsx`) buradan beslenir;
 * önceden iki ayrı kopya vardı ve kayma riski taşıyordu.
 */

export interface FaqItem {
  readonly q: string;
  readonly a: string;
}

export const HOME_FAQ_TR: readonly FaqItem[] = [
  {
    q: "Dosyalarım Google Drive'dan başka bir yere taşınıyor mu?",
    a: "Hayır. Dosyaların Google Drive'da kalır. FolderPls, etiketlediğin her dosyanın Drive kimliğini, adını ve türünü, ayrıca eklediğin etiket ve notları tarayıcında tutar. Dosya içerikleri Drive'da kalır, FolderPls onları kopyalamaz.",
  },
  {
    q: "FolderPls kullanınca Drive klasör yapım bozulur mu?",
    a: "Hayır. Etiketleme Drive klasörlerini değiştirmez: etiket ve notlar tarayıcında durur, mevcut yapının üzerinde çalışır. Bir dosyayı kendin kopyalamadıkça, taşımadıkça, yeniden adlandırmadıkça ya da silmedikçe hiçbir şey taşınmaz ya da yeniden düzenlenmez.",
  },
  {
    q: "Drive izinleri nasıl çalışıyor?",
    a: "FolderPls dosyaları kendi Google erişiminle açar; Drive'da açamadığın bir dosyayı FolderPls'ten de açamazsın. Etiketlerin ve notların yalnız tarayıcında durur, paylaşılan dosyalarda bile başkası onları görmez.",
  },
  {
    q: "Metadata nerede saklanıyor?",
    a: "Kullandığın cihazda, tarayıcının depolama alanında (IndexedDB). Sunucumuza gelmez ve dosyaların içine yazılmaz. Drive bağlıyken kendi Drive'ındaki folderpls-tags.json dosyasına da yedeklenir, istersen JSON dosyasına da aktarabilirsin.",
  },
  {
    q: "Arama yapmak yerine neden filtreleme?",
    a: "Arama yapmak için dosya adını hatırlaman gerekir. Filtreleme ise 'bana onaylı pazarlama dosyalarını getir' demeni sağlar. İnsan beyni için daha doğaldır.",
  },
  {
    q: "FolderPls ücretli mi? Hesap açmam gerekiyor mu?",
    a: "Hayır. FolderPls ücretsiz ve açık kaynaktır (MIT Lisansı). Ücretli plan, deneme süresi ya da kota yoktur. Hesap da açmazsın: uygulamayı açar, dosyalarını görmek istediğinde Google Drive'ı bağlarsın.",
  },
  {
    q: "Etiketlerim başka cihazda da görünür mü?",
    a: "Kendiliğinden görünmez. O cihazda aynı Google hesabıyla Drive'ı bağlayınca FolderPls Drive'ındaki yedeği okuyup birleştirir. Drive bağlamadan taşımak için JSON olarak dışa aktarıp orada içe aktar. Tarayıcının site verilerini silersen yedeğin yoksa etiketlerin de silinir.",
  },
  {
    q: "Etiketlerimi Google Drive'ın kendi aramasında bulabilir miyim?",
    a: "Hayır. Etiketler Drive'da değil tarayıcında tutulur, bu yüzden Drive'ın kendi araması onları görmez. FolderPls yalnız seçtiğin dosyaları görür. Etikete göre FolderPls'te filtrele, sonra dosyayı Drive'da aç.",
  },
];

export const HOME_FAQ_EN: readonly FaqItem[] = [
  {
    q: "Are my files moved out of Google Drive?",
    a: "No. Your files stay in Google Drive. In your browser, FolderPls keeps each tagged file's Drive ID, name and type, plus the labels and notes you add. File contents stay in Drive; FolderPls doesn't copy them.",
  },
  {
    q: "Does FolderPls break my Drive folder structure?",
    a: "No. Tagging doesn't change your Drive folders: labels and notes live in your browser, on top of your existing structure. Nothing is moved or reorganized unless you copy, move, rename or delete a file yourself.",
  },
  {
    q: "How do permissions work?",
    a: "FolderPls opens files with your own Google access, so a file you can't open in Drive can't be opened from FolderPls either. Your tags and notes are only in your browser, so nobody else sees them, even on shared files.",
  },
  {
    q: "Where is the metadata stored?",
    a: "In your browser's storage (IndexedDB), on the device you use. It doesn't reach our servers and isn't written into the files. While Drive is connected it's also backed up to a folderpls-tags.json file in your own Drive, and you can export a JSON file any time.",
  },
  {
    q: "Why filtering instead of just search?",
    a: "Search assumes you remember file names. Filtering lets you say “show me approved marketing files” instead. It's closer to how people think.",
  },
  {
    q: "Does FolderPls cost anything? Do I need an account?",
    a: "No. FolderPls is free and open source (MIT License). There are no paid plans, trials or quotas. There is no account either: you open the app and connect Google Drive when you want to see your files.",
  },
  {
    q: "Will my tags show up on another device?",
    a: "Not by themselves. Connect the same Google account on the other device and FolderPls reads the backup in your Drive and merges it. Without Drive, export a JSON file and import it on the other device. If you clear your browser's site data without a backup, your tags are gone.",
  },
  {
    q: "Can I find my tags with Google Drive's own search?",
    a: "No. Tags live in your browser, not in Drive, so Drive's own search won't see them. FolderPls also only sees the files you pick. Filter by tag in FolderPls, then open the file in Drive.",
  },
];

/**
 * JSON-LD'ye yalnız İngilizce listenin ilk N sorusu gider (mevcut davranış
 * korunur). Listenin geri kalanını şemaya eklemek bir İÇERİK kararıdır —
 * bkz. bakım raporu F20.
 */
export const HOME_FAQ_SCHEMA_COUNT = 5;

/** JSON-LD metinleri düz (ASCII) tırnak kullanır; görünen metin tipografik tırnak içerebilir. */
export function toPlainQuotes(text: string): string {
  return text.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
}

export function faqPageJsonLd(items: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((faq) => ({
      "@type": "Question",
      name: toPlainQuotes(faq.q),
      acceptedAnswer: {
        "@type": "Answer",
        text: toPlainQuotes(faq.a),
      },
    })),
  };
}
