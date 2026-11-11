/**
 * Google Drive File Operations
 * Functions for getting, copying, renaming, and moving files
 */

import { DRIVE_API_BASE } from "@/lib/constants";
import type { DriveFile } from "@/lib/types";
import { isValidDriveId, createDriveError } from "../helpers";

const FILE_METADATA_FIELDS =
  "id,name,mimeType,iconLink,thumbnailLink,webViewLink,webContentLink,parents,createdTime,modifiedTime,size,shared,trashed";

type FileWrite = { method: "POST" | "PATCH"; payload?: object };

/** Calls an endpoint under `/files/` and resolves with the file resource Drive answers with. */
async function requestFile(
  accessToken: string,
  endpoint: string,
  failureMessage: string,
  write?: FileWrite
): Promise<DriveFile> {
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
  const init: RequestInit = { headers };
  if (write) {
    headers["Content-Type"] = "application/json";
    init.method = write.method;
    if (write.payload) init.body = JSON.stringify(write.payload);
  }

  const reply = await fetch(`${DRIVE_API_BASE}/files/${endpoint}`, init);
  if (reply.ok) return reply.json();
  throw createDriveError(failureMessage, await reply.json().catch(() => null));
}

/**
 * Get a single file by ID
 */
export async function getDriveFile(accessToken: string, fileId: string): Promise<DriveFile> {
  if (!isValidDriveId(fileId)) {
    throw new Error("Invalid file ID format");
  }

  const query = new URLSearchParams({ fields: FILE_METADATA_FIELDS, supportsAllDrives: "true" });
  return requestFile(accessToken, `${fileId}?${query}`, "Failed to fetch file");
}

/**
 * Copy a file to a destination folder
 */
export async function copyDriveFile(
  accessToken: string,
  fileId: string,
  newName?: string,
  parentId?: string
): Promise<DriveFile> {
  if (!isValidDriveId(fileId)) {
    throw new Error("Invalid file ID format");
  }
  if (parentId && !isValidDriveId(parentId)) {
    throw new Error("Invalid parent ID format");
  }

  return requestFile(accessToken, `${fileId}/copy?supportsAllDrives=true`, "Failed to copy file", {
    method: "POST",
    payload: {
      ...(newName ? { name: newName } : {}),
      ...(parentId ? { parents: [parentId] } : {}),
    },
  });
}

/**
 * Rename a file
 */
export async function renameDriveFile(
  accessToken: string,
  fileId: string,
  newName: string
): Promise<DriveFile> {
  if (!isValidDriveId(fileId)) {
    throw new Error("Invalid file ID format");
  }

  return requestFile(accessToken, `${fileId}?supportsAllDrives=true`, "Failed to rename file", {
    method: "PATCH",
    payload: { name: newName },
  });
}

/**
 * Move a file to a new parent folder
 */
export async function moveDriveFile(
  accessToken: string,
  fileId: string,
  destinationId: string,
  sourceId?: string
): Promise<DriveFile> {
  if (!isValidDriveId(fileId)) {
    throw new Error("Invalid file ID format");
  }
  if (!isValidDriveId(destinationId)) {
    throw new Error("Invalid new parent ID format");
  }
  if (sourceId && !isValidDriveId(sourceId)) {
    throw new Error("Invalid current parent ID format");
  }

  const query = new URLSearchParams({
    addParents: destinationId,
    supportsAllDrives: "true",
    ...(sourceId ? { removeParents: sourceId } : {}),
  });
  return requestFile(accessToken, `${fileId}?${query}`, "Failed to move file", { method: "PATCH" });
}
