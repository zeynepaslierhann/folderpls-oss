import * as Sentry from "@sentry/nextjs";
import { getSentryOptions } from "@/lib/monitoring/sentry-options";

// DSN yoksa Sentry hiç başlatılmaz. instrumentation.ts bu dosyayı Node çalışma zamanında yükler.
const options = getSentryOptions();
if (options.dsn) {
  Sentry.init(options);
}
