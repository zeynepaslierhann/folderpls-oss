/**
 * Google Drive API helper functions
 *
 * This file re-exports all functions from modular files for backward compatibility.
 * For new code, prefer importing from specific modules:
 * - @/lib/google-drive/api for API operations
 * - @/lib/google-drive/helpers for utility functions
 *
 * Scope: drive.file only (files created by the app or picked by the user).
 */

// Re-export types from centralized location
export type {
  DriveFile,
  SharedDrive,
} from "@/lib/types";

// Re-export all API operations
export * from "./api";

// Re-export helper functions
export {
  isFolder,
  getFileIcon,
  getFileThumbnailUrl,
  getVideoEmbedUrl,
  shouldOpenInDrive,
  getFileLocationUrl,
} from "./helpers";
