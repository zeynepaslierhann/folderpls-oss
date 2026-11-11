/**
 * Google Drive Trash Operations
 * Functions for trashing, restoring, and permanently deleting files
 */

import { DRIVE_API_BASE } from "@/lib/constants";
import type { DriveFile } from "@/lib/types";
import { isValidDriveId, createDriveError } from "../helpers";

const fileUrl = (fileId: string) => `${DRIVE_API_BASE}/files/${fileId}?supportsAllDrives=true`;

async function rejectUnlessOk(reply: Response, failureMessage: string): Promise<void> {
  if (reply.ok) return;
  throw createDriveError(failureMessage, await reply.json().catch(() => null));
}

async function setTrashed(
  accessToken: string,
  fileId: string,
  trashed: boolean,
  failureMessage: string
): Promise<DriveFile> {
  const reply = await fetch(fileUrl(fileId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ trashed }),
  });
  await rejectUnlessOk(reply, failureMessage);
  return reply.json();
}

/**
 * Move a file to trash
 */
export async function trashDriveFile(accessToken: string, fileId: string): Promise<DriveFile> {
  if (!isValidDriveId(fileId)) {
    throw new Error("Invalid file ID format");
  }
  return setTrashed(accessToken, fileId, true, "Failed to trash file");
}

/**
 * Restore a file from trash
 */
export async function restoreDriveFile(accessToken: string, fileId: string): Promise<DriveFile> {
  if (!isValidDriveId(fileId)) {
    throw new Error("Invalid file ID format");
  }
  return setTrashed(accessToken, fileId, false, "Failed to restore file");
}

/**
 * Permanently delete a file (removes from trash)
 */
export async function deleteDriveFile(accessToken: string, fileId: string): Promise<void> {
  if (!isValidDriveId(fileId)) {
    throw new Error("Invalid file ID format");
  }

  const reply = await fetch(fileUrl(fileId), {
    headers: { Authorization: `Bearer ${accessToken}` },
    method: "DELETE",
  });
  await rejectUnlessOk(reply, "Failed to delete file");
}
