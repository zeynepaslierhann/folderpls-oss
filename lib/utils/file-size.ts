/**
 * File Size Utility Functions
 *
 * Centralized file size formatting utilities.
 */

/**
 * Format file size in bytes to human-readable string
 * Handles string or number input, returns "—" for invalid values
 */
export function formatFileSize(bytes: string | number | undefined): string {
  if (bytes == null || bytes === "") return "—";

  const n = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;

  if (Number.isNaN(n)) return "—";

  const units = ["B", "KB", "MB", "GB"];
  let scaled = n;
  let tier = 0;
  while (scaled >= 1024 && tier < units.length - 1) {
    scaled /= 1024;
    tier += 1;
  }
  return `${tier === 0 ? scaled : scaled.toFixed(1)} ${units[tier]}`;
}
