/**
 * File utility functions for Google Drive
 * Helper functions for file type detection, icons, thumbnails, and URLs
 */

import type { DriveFile } from "@/lib/types";

const FOLDER_MIME = "application/vnd.google-apps.folder";

/**
 * Check if a Drive file is a folder
 */
export const isFolder = ({ mimeType }: DriveFile): boolean => mimeType === FOLDER_MIME;

export type FileIconKind =
  | "folder"
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "file";

const MEDIA_KINDS = ["image", "video", "audio"] as const;

// Order matters: OOXML spreadsheet types also contain "document" ("officedocument").
const KEYWORD_KINDS: ReadonlyArray<readonly [FileIconKind, readonly string[]]> = [
  ["spreadsheet", ["spreadsheet", "excel"]],
  ["document", ["document", "word"]],
  ["presentation", ["presentation", "powerpoint"]],
];

/**
 * Get icon type based on MIME type
 */
export function getFileIcon(mimeType: string): FileIconKind {
  if (mimeType === FOLDER_MIME) return "folder";

  const media = MEDIA_KINDS.find((kind) => mimeType.startsWith(`${kind}/`));
  if (media) return media;
  if (mimeType === "application/pdf") return "pdf";

  const keyword = KEYWORD_KINDS.find(([, words]) => words.some((word) => mimeType.includes(word)));
  return keyword ? keyword[0] : "file";
}

/**
 * Get file thumbnail or preview URL
 */
export function getFileThumbnailUrl({ thumbnailLink }: DriveFile): string | null {
  // Increase thumbnail size
  return thumbnailLink ? thumbnailLink.replace("=s220", "=s100") : null;
}

/**
 * Get Google Drive embed URL for video playback
 */
export function getVideoEmbedUrl({ id }: DriveFile): string {
  // Use Google Drive's preview/embed URL which handles authentication via cookies
  return `https://drive.google.com/file/d/${id}/preview`;
}

const OOXML = "application/vnd.openxmlformats-officedocument";

const DRIVE_VIEWABLE_MIMES = [
  "application/pdf",
  ...["document", "spreadsheet", "presentation", "form"].map((app) => `application/vnd.google-apps.${app}`),
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  `${OOXML}.wordprocessingml.document`,
  `${OOXML}.spreadsheetml.sheet`,
  `${OOXML}.presentationml.presentation`,
];

/**
 * Check if file should open in Google Drive (documents, PDFs, etc.)
 */
export function shouldOpenInDrive({ mimeType }: DriveFile): boolean {
  return DRIVE_VIEWABLE_MIMES.some((viewable) => mimeType.includes(viewable));
}

/**
 * Get Google Drive folder URL from folder ID
 */
function getDriveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

/**
 * Get file location URL in Drive (opens the folder containing the file)
 */
export function getFileLocationUrl({ webViewLink, parents }: DriveFile): string | null {
  if (!webViewLink?.includes("drive.google.com")) return null;

  // No parent means the file sits at the top of My Drive.
  return parents?.length ? getDriveFolderUrl(parents[0]) : "https://drive.google.com/drive";
}
