import type * as SentryNextjs from "@sentry/nextjs";
import { loadSentry } from "@/lib/monitoring/sentry-client";

// DSN yoksa (env tanımlı değil) Sentry hiç yüklenmez, başlatılmaz, hiçbir şey gönderilmez.
// DSN varsa SDK tembel yüklenir (bkz. lib/monitoring/sentry-client.ts). Replay, kullanıcı
// geri bildirimi ve performans izleme bilerek eklenmedi.
void loadSentry();

// Sayfa geçişlerini Sentry'ye bildirir (SDK'nın App Router için beklediği kanca).
export function onRouterTransitionStart(
  ...args: Parameters<typeof SentryNextjs.captureRouterTransitionStart>
): void {
  void loadSentry().then((Sentry) => Sentry?.captureRouterTransitionStart(...args));
}
