/**
 * Query utilities for Google Drive API
 * Internal helpers for sanitization and validation
 */

/**
 * Sanitize user input for Google Drive API queries.
 * Escapes special characters to prevent query injection attacks.
 * Google Drive query syntax uses single quotes for string literals.
 */
export function sanitizeQueryValue(value: string): string {
  // Escape backslashes first, then single quotes
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * Validate Google Drive file/folder ID format.
 * Valid IDs contain only alphanumeric characters, hyphens, and underscores.
 */
export function isValidDriveId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Create a safe error for Drive API failures.
 * In production, we never expose raw API error messages to prevent information leakage.
 * Raw errors may contain sensitive info about API structure, quotas, or account details.
 */
export function createDriveError(fallbackMessage: string, rawError?: unknown): Error {
  // Ham API metni arayüze çıkmaz; yalnız HTTP kodu taşınır (401 = yeniden bağlan).
  const code = (rawError as { error?: { code?: unknown } } | null | undefined)?.error?.code;
  return Object.assign(new Error(fallbackMessage), typeof code === "number" ? { code } : {});
}
