# Graph v2 — tasarım notu

## Eskisi neyi göstermeye çalışıyordu, neden karışıktı

`components/dashboard/graph-view` (react-force-graph-2d) kök klasörden itibaren
**tüm** dosya/klasör ağacını (`allGraphFiles` — kökten özyinelemeli tam çekim) tek bir
fizik simülasyonunda çiziyordu: kök + tüm klasörler + tüm dosyalar + kullanılan tüm
etiketler + tüm dosya-dosya ilişkileri, hepsi aynı anda. Sonuç, kullanıcı sayısı arttıkça
büyüyen bir "yumak": yüzlerce düğüm iç içe çarpışıyor, hangi dosyanın hangi etikete ait
olduğunu ya da iki dosyanın nasıl bağlı olduğunu okumak zorlaşıyordu. Filtre yoktu (yalnız
etiket/ilişki bağlantılarını global aç/kapat), odak kavramı yoktu — her zaman "her şey".
Ayrıca `react-force-graph-2d` + `force-graph` bağımlılığı (~6.3 MB paketlenmemiş, d3-force +
canvas/WebGL render motoru) yalnız bu görünüm için yükleniyordu.

## Yeni model: soru-odaklı, saf, hafif

`lib/graph/` artık DOM'dan ve veri kaynağından bağımsız saf bir model: `buildGraphModel`
bellekteki `DriveFile[]` + `TaggedItem[]` + `LabelItem[]` (+ `PropertyDefinition[]`) alır,
düğüm/kenar/komşuluk indeksi üretir. `getFocusedSubgraph` bu modelden **1-2 adım komşuluk**
çıkarır (varsayılan görünüm artık "her şey" değil, seçili düğümün çevresi); `applyGraphFilters`
düğüm türü/etiket/klasör'e göre daraltır; `clusterFocusResult` bir gruptaki düğüm sayısı eşiği
aşarsa (varsayılan 40/grup, toplam sınır 500) geri kalanını tek bir "+N daha" küme düğümüne
toplar ve genişletilebilir bırakır. `getScopeDescriptor` kapsamı (kişisel/organizasyon) arayüze
döndürür — veri çekmez, yalnız `DataScope`'u okur.

## Görselleştirme kararı: özel hafif SVG düzeni, react-force-graph-2d YOK

Odaklı görünümde düğüm sayısı küçük (tipik: bir düğüm + 1-2 adım komşuları, kümeleme ile en
kötü durumda da sınırlı). Bu ölçekte sürekli bir fizik motoruna gerek yok: `lib/graph/layout.ts`
birkaç yüz düğüme kadar senkron çalışan, bağımlılıksız, deterministik bir yay/itme rahatlatması
(~120 iterasyon, O(n²), n≤500 için milisaniyeler) hesaplıyor ve sonucu düz konumlar olarak
döndürüyor — sürekli `requestAnimationFrame` döngüsü yok, `prefers-reduced-motion` otomatik
uyumlu (animasyon zaten yok, yalnız odak değişince konum geçişi CSS transition ile, motion
tercihine göre kapatılabilir). Render SVG: DOM düğümleri gerçek, odaklanabilir, `aria-*`
taşıyabilir elemanlar — klavye gezinme ve erişilebilir liste görünümü bunun üzerine doğal
oturuyor. Bu, `react-force-graph-2d`/`force-graph` bağımlılığını tamamen kaldırır (bkz. teslim
raporunda bundle etkisi).
