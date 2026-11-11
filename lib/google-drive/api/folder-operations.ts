/**
 * Google Drive Folder Operations
 * Functions for creating folders
 */

import { DRIVE_API_BASE } from "@/lib/constants";
import type { DriveFile } from "@/lib/types";
import { isValidDriveId, createDriveError } from "../helpers";

/**
 * Create a new folder in Google Drive
 */
export async function createDriveFolder(accessToken: string, name: string, parentId?: string): Promise<DriveFile> {
  if (parentId && !isValidDriveId(parentId)) {
    throw new Error("Invalid parent ID format");
  }

  const folder = {
    name,
    mimeType: "application/vnd.google-apps.folder",
    ...(parentId ? { parents: [parentId] } : {}),
  };
  const reply = await fetch(`${DRIVE_API_BASE}/files?supportsAllDrives=true`, {
    body: JSON.stringify(folder),
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
  });

  if (reply.ok) return reply.json();
  throw createDriveError("Failed to create folder", await reply.json().catch(() => null));
}
