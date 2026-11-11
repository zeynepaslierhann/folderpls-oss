# Arama v2 — mimari notu

## Eskisinde ne vardı, neden yetersizdi

- (Silindi, 2026-10-11) `lib/hooks/use-drive-search.ts` her tuş vuruşunda (300ms debounce ile) Drive'ın
  `files.list` full-text arama API'sine gidiyordu (`searchDriveFiles`). Kota tüketiyor,
  gizlilik açısından her arama terimini Google'a gönderiyor, ve ağ gecikmesi kadar yavaş.
- Türkçe normalizasyon yoktu: `toLowerCase()` düz JS ile yapılıyordu, "İstanbul" ile
  "istanbul" ya da "Şirket" ile "sirket" (Türkçe klavyesiz yazım) eşleşmiyordu.
- Yazım hatası toleransı (bulanık eşleşme) yoktu; tek harf hata tüm sonucu kaybettiriyordu.
- Arama yalnızca dosya adı + etiket adına bakıyordu; özellik (property) değerleri ve not
  metni aranamıyordu.
- Yapısal filtre yoktu: "etiket=X VE tür=pdf" gibi bir sorgu kurmanın tek yolu, önceden
  `SmartCollection` olarak kaydedilmiş, elle kurulmuş `FilterGroup`'lardı — arama kutusuyla
  ilgisi yoktu, ikisi paralel ama birbirinden habersiz iki sistemdi.
- `lib/search/search-utils.ts` (`applyFilters`) sıralama yapmıyordu; sonuçlar yalnızca
  dosya adına göre (`localeCompare`) sıralanıyordu, alan ağırlıklı bir skor yoktu.

## Yeni mimari

- `lib/search/` — saf, DataScope-agnostik motor. Girdi: `DriveFile[]` + `TaggedItem[]` +
  `LabelItem[]` + `PropertyDefinition[]`. Drive API'ye hiç dokunmuyor.
  - `normalize.ts` — Türkçe katlama (İ/I/ı/ş/ğ/ü/ö/ç + yaygın Latin aksanları), orijinal
    string ile 1:1 karakter eşlemesi korunuyor (vurgulama matematiği için gerekli).
  - `index-builder.ts` — alan başına (`name`/`label`/`property`/`note`) ters indeks:
    `token -> item[]` + ikili aramayla önek sorgusu için sıralı token dizisi + bulanık
    eşleşme için ilk-karaktere göre kova.
  - `fuzzy.ts` — sınırlı (bantlı) Levenshtein; terim uzunluğuna göre ölçeklenen yazım
    hatası bütçesi (≤3 karakter: 0, ≤5: 1, daha uzun: 2).
  - `engine.ts` — `createSearchEngine(input)` indeksi bir kez kurar; `search(query)` her
    tuş vuruşunda senkron çalışır. Skor = alan ağırlığı (ad 100 > etiket 60 > özellik 40 >
    not 20) × eşleşme türü çarpanı (tam 1.0 > önek 0.85 > alt-dize 0.6 > bulanık 0.35).
  - `filters.ts` — yapısal çip eşleştirme (etiket/tür-uzantı/klasör/tarih/özellik/ilişkili
    dosya), tamamı `IndexedItem` üzerinde saf boolean.
  - `query-parser.ts` — yazılan `etiket:Fatura`, `tarih:2024-01-01..2024-02-01`,
    `ozellik:Durum=Onaylandı` gibi kısayolları çözülebiliyorsa çipe çevirir, çözülemiyorsa
    düz metin olarak bırakır (sessizce kaybolmaz).
  - `saved-search.ts` — `queryToFilterGroup()`: yeni `SearchQuery`'yi eski `FilterGroup`'a
    serileştirir (select/status/multi-select için görünen adı ham `option.id`'ye geri
    çözerek — `applyFilters` ham değeri karşılaştırıyor). `search-utils.ts`'e dokunulmadı;
    geriye uyum testi (`tests/unit/search/saved-search.test.ts`) gerçek `applyFilters`'ı
    çağırıp aynı sonucu doğruluyor.
  - `merge-sources.ts` — sayfaların zaten bellekte tuttuğu birden çok `DriveFile[]`
    kaynağını (mevcut klasör + ağaç önbelleği + graph anlık görüntüsü) id'ye göre
    birleştirir; yeni bir Drive isteği açmaz.
- `lib/hooks/use-file-search.ts` — React bağlayıcısı. Eski `useDriveSearch` ile aynı
  `searchQuery/setSearchQuery/searchResults/isSearching/isSearchMode` şeklini koruyor (bu
  yüzden `FileGridItem`/`FileItem` kablolaması hiç değişmedi), üzerine çip yönetimi,
  ⌘K palet state'i, son aramalar (scope'a göre `localStorage` namespace'li) ve öneriler
  ekliyor.
- `components/dashboard/search/` — `SearchCommandDialog` (ARIA combobox: `role=combobox`/
  `listbox`/`option`, `aria-activedescendant`, ok tuşları + Enter/Escape), `FilterChipBar`
  + `AddFilterMenu` (etiket/tür/tarih/özellik/ilişkili-dosya için ekleme menüsü),
  `HighlightedText`, `SearchEmptyState`.

## Performans (ölçüldü, `tests/unit/search/performance.test.ts`)

10.000 sentetik öğede (karışık dosya/klasör, %33'ü etiketli+özellikli):

- İndeks kurulumu: ~30-110ms (tek seferlik, dosya listesi değişince yeniden kurulur).
- Arama (tuş vuruşu başına): ortalama ~3-12ms, en kötü ~35ms — hedefin (<50ms) altında.
- Çip + metin birlikte: ~2-5ms (aday kümesi çiple önce daraltılıyor).

Sayılar CI/geliştirme makinesine göre değişir; testteki sert eşik (200ms/400ms) kasıtlı
gevşek tutuldu (flakiness'i önlemek için), gerçek bütçe konsola loglanan sayılarla izleniyor.

## Bilinçli kapsam daralması: artık "her şeyi" aramıyor

Eski `useDriveSearch`, Drive'ın `files.list` full-text arama uç noktasını çağırarak
kullanıcının TÜM Drive hesabını tarıyordu. Görev tanımı gereği ("Drive API'ye ek istek
atan tam-metin arama yapma — kota ve gizlilik") yeni motor yalnızca **bellekte zaten
yüklü** `DriveFile[]` üzerinde çalışıyor:

- `google-drive/page.tsx`: klasör bağlandığında recursive olarak çekilen tüm ağaç +
  graph görünümünden önbelleğe alınmış her şey (`mergeFileSources`).
- `ultra/page.tsx`: o an açık klasör + genişletilmiş klasör ağacı önbelleği
  (`folderChildrenData`) + graph anlık görüntüsü (`allGraphFiles`).

Kullanıcı hiç gezinmeden, hiç graph/ağaç açmadan çok büyük bir Drive'ın uzak bir
köşesindeki bir dosyayı arasa, o dosya henüz belleğe hiç girmediyse bulunamaz. Bu,
kapsamlı bir "tüm Drive'ı önceden indeksle" mimarisi gerektirir ki bu iş büyük bir
mimari karar (bellek/performans/veri modeli etkisi) olduğu için bu görevin dışında
bırakıldı — gerekirse ayrı bir kararla ele alınmalı.

## Organizasyon kapsamı

Motor `DataScope`'tan tamamen habersiz: yalnızca `DriveFile[]`/`TaggedItem[]`/
`LabelItem[]`/`PropertyDefinition[]` görür. Hook, yalnızca son-arama önbelleğinin
`localStorage` anahtarı için `scopeKey(scope)` kullanıyor (kişisel/org geçmişi
karışmasın diye). "Sahip/ekleyen" (owner) çip türü tipte var ama UI'da hiç sunulmuyor —
`DriveFile`'da bugün owner alanı yok (org modeli ayrı bir ajan tarafından kuruluyor);
motor bir `resolveOwner` enjeksiyon noktasına hazır ama bugün hiçbir sayfa bunu
sağlamıyor. Organizasyon modeli tamamlanınca yalnızca veri kaynağı eklenmesi yeterli,
motor/UI değişmeden çalışır.

## Test durumu

`tests/unit/search/*` — 54 test (normalizasyon, bulanık eşleşme, motor sıralama/filtre/
vurgulama, satır-içi çip ayrıştırma, SmartCollection geriye-uyum, birleştirme, performans).
Repo genelinde toplam 126 test yeşil, `tsc --noEmit` ve `eslint` temiz (mevcut, ilgisiz bir
uyarı — `runAutoTag` bağımlılığı — google-drive/page.tsx'te benden önce vardı).
