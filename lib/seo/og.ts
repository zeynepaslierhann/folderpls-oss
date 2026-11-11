/**
 * Shared social card (app/opengraph-image.tsx). A page that sets its own
 * `openGraph` object replaces the inherited one, so it must list the image
 * explicitly or the page ends up without og:image.
 */
export const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "FolderPls — organize Google Drive with tags, without moving files",
} as const;
