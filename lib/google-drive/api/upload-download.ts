/**
 * Google Drive Upload/Download Operations
 * Functions for uploading and downloading files
 */

import { DRIVE_API_BASE, DRIVE_UPLOAD_URL } from "@/lib/constants";
import type { DriveFile } from "@/lib/types";
import { isValidDriveId, createDriveError } from "../helpers";

interface OfficeFormat {
  mimeType: string;
  extension: string;
}

interface DownloadedFile {
  blob: Blob;
  filename: string;
}

// Workspace documents have no binary form, so Drive has to convert them on the way out.
const OFFICE_FORMAT_FOR_WORKSPACE: Record<string, OfficeFormat> = {
  "application/vnd.google-apps.document": {
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: ".docx",
  },
  "application/vnd.google-apps.spreadsheet": {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: ".xlsx",
  },
  "application/vnd.google-apps.presentation": {
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    extension: ".pptx",
  },
};

const UPLOAD_RESPONSE_FIELDS =
  "id,name,mimeType,iconLink,thumbnailLink,webViewLink,webContentLink,parents,createdTime,modifiedTime,size,shared";

const bearer = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

const parseFailure = (reply: Response) => reply.json().catch(() => null);

/** Drops a trailing extension; dotfiles and names ending in a dot stay whole. */
function stripExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  const tail = name.slice(dot + 1);
  return dot <= 0 || tail === "" || tail.includes("/") ? name : name.slice(0, dot);
}

async function exportWorkspaceFile(
  accessToken: string,
  file: DriveFile,
  format: OfficeFormat
): Promise<DownloadedFile> {
  const query = new URLSearchParams({ mimeType: format.mimeType });
  const reply = await fetch(`${DRIVE_API_BASE}/files/${file.id}/export?${query}`, {
    headers: bearer(accessToken),
  });
  if (!reply.ok) throw createDriveError("Failed to export file", await parseFailure(reply));
  return { blob: await reply.blob(), filename: stripExtension(file.name) + format.extension };
}

async function fetchFileContent(accessToken: string, file: DriveFile): Promise<DownloadedFile> {
  const reply = await fetch(`${DRIVE_API_BASE}/files/${file.id}?alt=media&supportsAllDrives=true`, {
    headers: bearer(accessToken),
  });
  if (reply.ok) return { blob: await reply.blob(), filename: file.name };

  // Special error code for scope limitations - handled by UI
  if (reply.status === 403) throw new Error("INSUFFICIENT_SCOPE");
  throw createDriveError("Failed to download file", await parseFailure(reply));
}

/**
 * Download a file as Blob (handles Google Docs export)
 */
export async function downloadDriveFile(accessToken: string, file: DriveFile): Promise<DownloadedFile> {
  if (!isValidDriveId(file.id)) {
    throw new Error("Invalid file ID format");
  }

  const format = OFFICE_FORMAT_FOR_WORKSPACE[file.mimeType];
  return format ? exportWorkspaceFile(accessToken, file, format) : fetchFileContent(accessToken, file);
}

/**
 * Upload a new file into Drive (simple multipart upload for small files).
 * `appProperties` are visible only to this OAuth client (used to mark the backup).
 */
export async function uploadDriveFile(
  accessToken: string,
  file: File,
  parentId?: string,
  { appProperties }: { appProperties?: Record<string, string> } = {}
): Promise<DriveFile> {
  if (parentId && !isValidDriveId(parentId)) {
    throw new Error("Invalid parent ID format");
  }

  const description = {
    name: file.name,
    ...(parentId ? { parents: [parentId] } : {}),
    ...(appProperties ? { appProperties } : {}),
  };
  const parts = new FormData();
  parts.append("metadata", new Blob([JSON.stringify(description)], { type: "application/json" }));
  parts.append("file", file);

  const reply = await fetch(
    `${DRIVE_UPLOAD_URL}/files?uploadType=multipart&supportsAllDrives=true&fields=${UPLOAD_RESPONSE_FIELDS}`,
    { body: parts, method: "POST", headers: bearer(accessToken) }
  );

  if (reply.ok) return reply.json();
  throw createDriveError("Failed to upload file to Drive", await parseFailure(reply));
}
