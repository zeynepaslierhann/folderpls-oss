import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { CSP_REPORT_GROUP, CSP_REPORT_PATH } from "./lib/security/csp";

// Sentry isteğe bağlıdır: DSN tanımlı değilse SDK de, CSP'deki ağ izni de eklenmez.
const sentryEnabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

// Content-Security-Policy burada DEĞİL: istek başına nonce gerektirdiği için proxy.ts koyar
// (lib/security/csp.ts). Varsayılan zorunlu; CSP_REPORT_ONLY=1 yalnız raporlar.

// Uygulamanın kullanmadığı tarayıcı özelliklerini kapat. fullscreen/autoplay/
// encrypted-media varsayılanda bırakıldı: Drive video iframe'i bunları kullanıyor.
const permissionsPolicy = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "payment=()",
  "usb=()",
  "serial=()",
  "hid=()",
  "midi=()",
  "accelerometer=()",
  "gyroscope=()",
  "magnetometer=()",
  "display-capture=()",
  "browsing-topics=()",
].join(", ");

const REMOTE_IMAGE_HOSTS = [
  "lh3.googleusercontent.com",
  "lh3.google.com",
  "drive.google.com",
  "*.googleusercontent.com",
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: REMOTE_IMAGE_HOSTS.map((hostname) => ({ protocol: "https" as const, hostname, pathname: "/**" })),
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  // Short / Turkish / guessed legal URLs -> canonical legal pages. Google's
  // OAuth consent screen and marketplace reviewers often try /privacy, /terms.
  async redirects() {
    const to = (source: string, destination: string) => ({ source, destination, permanent: true });
    return [
      to("/privacy", "/privacy-policy"),
      to("/terms", "/terms-of-service"),
      to("/tos", "/terms-of-service"),
      to("/tr/privacy", "/tr/gizlilik-politikasi"),
      to("/tr/privacy-policy", "/tr/gizlilik-politikasi"),
      to("/tr/terms", "/tr/kullanim-sartlari"),
      to("/tr/terms-of-service", "/tr/kullanim-sartlari"),
      to("/gizlilik", "/tr/gizlilik-politikasi"),
      to("/gizlilik-politikasi", "/tr/gizlilik-politikasi"),
      to("/kvkk", "/tr/gizlilik-politikasi"),
      to("/kullanim-sartlari", "/tr/kullanim-sartlari"),
      // Hesap, ödeme ve organizasyon sayfaları kaldırıldı; eski bağlantılar panele gider.
      { source: "/login", destination: "/dashboard/google-drive", permanent: false },
      { source: "/signup", destination: "/dashboard/google-drive", permanent: false },
      { source: "/forgot-password", destination: "/dashboard/google-drive", permanent: false },
      { source: "/dashboard/ultra", destination: "/dashboard/google-drive", permanent: false },
      { source: "/dashboard/sayim", destination: "/dashboard/google-drive", permanent: false },
      { source: "/dashboard/organization/:path*", destination: "/dashboard/google-drive", permanent: false },
      { source: "/invite/:path*", destination: "/dashboard/google-drive", permanent: false },
    ];
  },

  async headers() {
    const securityHeaders = [
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        // The legacy XSS auditor is gone from modern browsers and its
        // "block" mode could itself be abused; OWASP recommends "0" and
        // relying on CSP instead.
        key: "X-XSS-Protection",
        value: "0",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains",
      },
      {
        key: "Reporting-Endpoints",
        value: `${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"`,
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        // `same-origin` would break signInWithPopup (the popup loses its
        // window.opener reference and can't postMessage the auth result
        // back). `same-origin-allow-popups` keeps that channel open while
        // still isolating this origin's browsing context group from other
        // cross-origin openers (Spectre-class isolation).
        key: "Cross-Origin-Opener-Policy",
        value: "same-origin-allow-popups",
      },
      {
        key: "Permissions-Policy",
        value: permissionsPolicy,
      },
    ];

    // Sayfalara herkese açık Cache-Control VERİLMEZ: HTML istek başına nonce taşır; CDN'de
    // paylaşılan bir kopya herkese aynı nonce'u sunar ve nonce'u anlamsızlaştırır.
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// SENTRY_AUTH_TOKEN yoksa kaynak harita yüklemesi hiç denenmez ve build kırılmaz.
const hasSentryAuthToken = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      sentryUrl: process.env.SENTRY_URL || "https://de.sentry.io",
      silent: !hasSentryAuthToken,
      telemetry: false,
      sourcemaps: { disable: !hasSentryAuthToken },
    })
  : nextConfig;
