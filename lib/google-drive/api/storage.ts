/**
 * Google Drive Storage Operations
 * Functions for storage quota information
 */

import { DRIVE_API_BASE } from "@/lib/constants";
import type { DriveStorageQuota } from "@/lib/types";
import { createDriveError } from "../helpers";

async function fetchAbout(accessToken: string, fields: string, failureMessage: string) {
  const reply = await fetch(`${DRIVE_API_BASE}/about?fields=${fields}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (reply.ok) return reply.json();
  throw createDriveError(failureMessage, await reply.json().catch(() => null));
}

/** Drive reports quota numbers as strings; anything unreadable counts as absent. */
function readCount(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const count = parseInt(String(value), 10);
  return Number.isNaN(count) ? null : count;
}

/**
 * Get the user's Drive storage quota
 */
export async function getDriveStorageQuota(accessToken: string): Promise<DriveStorageQuota> {
  const about = await fetchAbout(accessToken, "storageQuota(limit,usage)", "Failed to fetch Drive storage quota");
  return {
    limit: readCount(about?.storageQuota?.limit),
    usage: readCount(about?.storageQuota?.usage) ?? 0,
  };
}

export interface DriveAccount {
  email: string | null;
  displayName: string | null;
  /** Bu hesabın etiket deposu (`permissionId` özeti). Eski kayıtlarda yok. */
  storeKey?: string;
}

export interface DriveAccountInfo {
  email: string | null;
  displayName: string | null;
  /** Hesaba kalıcı bağlı kimlik; e-posta değişse de aynı kalır. Tarayıcıda saklanmaz, yalnız özeti alınır. */
  permissionId: string | null;
}

/** Bağlı Google hesabı. `about.get` `drive.file` kapsamıyla da çalışır. */
export async function getDriveAccount(accessToken: string): Promise<DriveAccountInfo> {
  const data = await fetchAbout(accessToken, "user(displayName,emailAddress,permissionId)", "Failed to fetch Drive account");
  return {
    email: typeof data?.user?.emailAddress === "string" ? data.user.emailAddress : null,
    displayName: typeof data?.user?.displayName === "string" ? data.user.displayName : null,
    permissionId: typeof data?.user?.permissionId === "string" && data.user.permissionId ? data.user.permissionId : null,
  };
}
