import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Sunucuda (Server Components, route handler, server action) yakalanan hataları Sentry'ye iletir.
// DSN yokken Sentry başlatılmadığı için çağrı etkisizdir.
export const onRequestError = Sentry.captureRequestError;
