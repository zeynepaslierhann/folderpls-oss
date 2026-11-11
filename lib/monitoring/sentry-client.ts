/**
 * Tarayıcıda Sentry'yi TEMBEL yükler.
 *
 * Neden `import * as Sentry` değil: statik içe aktarılırsa SDK HER sayfaya girer (DSN olmasa
 * bile). `NEXT_PUBLIC_SENTRY_DSN` derleme anında gömülür; DSN yokken aşağıdaki dal çalışma
 * anında yanlış olur ve SDK parçası HİÇ indirilmez — Sentry.init hiç çağrılmaz.
 * DSN varken SDK, yalnız kullandığımız üç işlevi dışa aktaran ./sentry-sdk üzerinden ayrı bir
 * parça olarak hidrasyondan sonra yüklenir (ölçülen boyut README'de). Yüklenmeden önce
 * (ilk ~yüz ms) oluşan hatalar yakalanmaz — ücretsiz plan için kabul edilen takas.
 */
type SentryModule = typeof import("./sentry-sdk");

let sentryPromise: Promise<SentryModule | null> | undefined;

/** SDK'yı bir kez yükleyip başlatır; DSN yoksa ya da parça yüklenemezse (ağ, içerik engelleyici) null. */
export function loadSentry(): Promise<SentryModule | null> {
  // Literal erişim şart: Next.js NEXT_PUBLIC_* değerlerini derleme anında yalnızca böyle gömer.
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    if (!sentryPromise) {
      // Ayarlar (temizleyici regex'ler dahil) da aynı tembel parçada: DSN yokken hiçbiri yüklenmez.
      sentryPromise = Promise.all([import("./sentry-sdk"), import("./sentry-options")])
        .then(([Sentry, { getSentryOptions }]) => {
          Sentry.init(getSentryOptions());
          return Sentry;
        })
        .catch(() => null);
    }
    return sentryPromise;
  }
  return Promise.resolve(null);
}

/** Hata sınırlarından (error.tsx) çağrılır; DSN yoksa hiçbir şey yapmaz. */
export function captureClientException(error: unknown): void {
  void loadSentry().then((Sentry) => Sentry?.captureException(error));
}
