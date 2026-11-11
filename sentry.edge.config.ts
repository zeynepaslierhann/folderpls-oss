import * as Sentry from "@sentry/nextjs";
import { getSentryOptions } from "@/lib/monitoring/sentry-options";

// middleware.ts Edge çalışma zamanında koşar; instrumentation.ts bu dosyayı orada yükler.
const options = getSentryOptions();
if (options.dsn) {
  Sentry.init(options);
}
