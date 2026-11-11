/**
 * Tarayıcı tarafının Sentry'den kullandığı TÜM yüzey: üç işlev, başka hiçbir şey.
 *
 * Neden ayrı dosya: `import('@sentry/nextjs')` modülün bütün ad alanını ister; paketleyici
 * Replay ve Feedback kodunu da (kullanılmıyor olsa bile) tembel parçaya koyar. Yalnız adlandırılmış
 * yeniden dışa aktarım olan bu dosyayı tembel yükleyince paket (sideEffects: false) kullanılmayan
 * kısmı atar. Yeni bir Sentry işlevi gerekirse BURAYA ekle; ölçümü README'deki komutla yenile.
 */
export { init, captureException, captureRouterTransitionStart } from "@sentry/nextjs";
