/**
 * Public site origin used for canonical URLs, sitemap and structured data.
 * Set NEXT_PUBLIC_APP_URL to your own origin when you deploy.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");

/** Contact address of whoever runs this copy. Empty by default: the site then points to GitHub issues. */
export const CONTACT_EMAIL = (process.env.NEXT_PUBLIC_CONTACT_EMAIL || "").trim();

export const PROJECT_ISSUES_URL = "https://github.com/zeynepaslierhann/folderpls-oss/issues";
