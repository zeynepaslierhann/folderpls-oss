/**
 * Google Drive List Operations
 * Functions for listing files, folders, shared drives, and trash
 */

import { DRIVE_API_BASE, DEFAULT_PAGE_SIZE, LARGE_PAGE_SIZE } from "@/lib/constants";
import type { DriveFile, DriveListResponse, SharedDriveListResponse } from "@/lib/types";
import { sanitizeQueryValue, isValidDriveId, createDriveError, isFolder } from "../helpers";

const FILE_LIST_FIELDS =
  "nextPageToken,files(id,name,mimeType,iconLink,thumbnailLink,webViewLink,webContentLink,parents,createdTime,modifiedTime,size,shared)";

interface PageOptions {
  pageSize?: number;
  pageToken?: string;
}

interface FolderListOptions extends PageOptions {
  folderId?: string;
  nameEquals?: string;
  nameContains?: string;
  mimeType?: string;
}

async function getJson<T>(
  accessToken: string,
  endpoint: string,
  query: URLSearchParams,
  failureMessage: string
): Promise<T> {
  const reply = await fetch(`${DRIVE_API_BASE}/${endpoint}?${query}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (reply.ok) return reply.json();
  throw createDriveError(failureMessage, await reply.json().catch(() => null));
}

function withPageToken(query: URLSearchParams, pageToken?: string): URLSearchParams {
  if (pageToken) query.set("pageToken", pageToken);
  return query;
}

/** Runs one `files.list` request across all drives. */
function searchFiles(
  accessToken: string,
  search: { q: string; orderBy: string; pageSize: number; pageToken?: string },
  failureMessage: string
): Promise<DriveListResponse> {
  const query = new URLSearchParams({
    q: search.q,
    orderBy: search.orderBy,
    pageSize: String(search.pageSize),
    fields: FILE_LIST_FIELDS,
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  return getJson(accessToken, "files", withPageToken(query, search.pageToken), failureMessage);
}

const childOf = (folderId: string) => `'${folderId}' in parents`;

/**
 * List files in a Google Drive folder
 */
export async function listDriveFiles(
  accessToken: string,
  options: FolderListOptions = {}
): Promise<DriveListResponse> {
  const { folderId, pageSize = DEFAULT_PAGE_SIZE, pageToken, nameEquals, nameContains, mimeType } = options;

  let q = "trashed = false";
  if (folderId) {
    if (folderId !== "root" && !isValidDriveId(folderId)) {
      throw new Error("Invalid folder ID format");
    }
    q += ` and ${childOf(folderId)}`;
  }
  if (nameEquals) {
    const sanitized = sanitizeQueryValue(nameEquals);
    q += ` and name = '${sanitized}'`;
  }
  if (nameContains) {
    const sanitized = sanitizeQueryValue(nameContains);
    q += ` and name contains '${sanitized}'`;
  }
  if (mimeType) {
    const sanitized = sanitizeQueryValue(mimeType);
    q += ` and mimeType = '${sanitized}'`;
  }

  return searchFiles(accessToken, { q, orderBy: "folder,name", pageSize, pageToken }, "Failed to fetch Drive files");
}

/**
 * List files shared with the user
 */
export async function listSharedWithMeFiles(
  accessToken: string,
  options: PageOptions = {}
): Promise<DriveListResponse> {
  const { pageSize = DEFAULT_PAGE_SIZE, pageToken } = options;
  return searchFiles(
    accessToken,
    { q: "sharedWithMe = true and trashed = false", orderBy: "sharedWithMeTime desc,name", pageSize, pageToken },
    "Failed to fetch shared files"
  );
}

/**
 * List shared drives (Team Drives)
 */
export async function listSharedDrives(
  accessToken: string,
  options: PageOptions = {}
): Promise<SharedDriveListResponse> {
  const { pageSize = DEFAULT_PAGE_SIZE, pageToken } = options;
  const query = new URLSearchParams({
    fields: "nextPageToken,drives(id,name,capabilities)",
    pageSize: String(pageSize),
  });
  return getJson(accessToken, "drives", withPageToken(query, pageToken), "Failed to fetch shared drives");
}

/**
 * List files in a shared drive
 */
export async function listSharedDriveFiles(
  accessToken: string,
  driveId: string,
  options: Pick<FolderListOptions, "folderId" | "pageSize" | "pageToken"> = {}
): Promise<DriveListResponse> {
  const { folderId = driveId, pageSize = DEFAULT_PAGE_SIZE, pageToken } = options;

  if (!isValidDriveId(driveId)) {
    throw new Error("Invalid drive ID format");
  }
  if (folderId && !isValidDriveId(folderId)) {
    throw new Error("Invalid folder ID format");
  }

  return searchFiles(
    accessToken,
    { q: `${childOf(folderId)} and trashed = false`, orderBy: "folder,name", pageSize, pageToken },
    "Failed to fetch shared drive files"
  );
}

/**
 * List trashed (deleted) files in Google Drive.
 *
 * SCOPE LIMITATION: This function requires broader scopes than drive.file.
 * With drive.file scope (default), this will only return trashed files that
 * were originally created by this application.
 */
export async function listTrashedDriveFiles(
  accessToken: string,
  options: PageOptions = {}
): Promise<DriveListResponse> {
  const { pageSize = DEFAULT_PAGE_SIZE, pageToken } = options;
  return searchFiles(
    accessToken,
    { q: "trashed = true", orderBy: "folder,name", pageSize, pageToken },
    "Failed to fetch trashed Drive files"
  );
}

/** Yields a folder's direct children, fetching the next page only when it is reached. */
async function* eachChild(accessToken: string, folderId: string): AsyncGenerator<DriveFile> {
  let cursor: string | undefined;
  do {
    const page = await listDriveFiles(accessToken, { folderId, pageSize: LARGE_PAGE_SIZE, pageToken: cursor });
    yield* page.files;
    cursor = page.nextPageToken;
  } while (cursor);
}

/**
 * Recursively list all files in a folder (non-folder items only)
 */
export async function listDriveFilesRecursive(
  accessToken: string,
  folderId: string,
  pathPrefix = ""
): Promise<{ file: DriveFile; path: string }[]> {
  if (!isValidDriveId(folderId)) {
    throw new Error("Invalid folder ID format");
  }

  const descendants: { file: DriveFile; path: string }[] = [];
  for await (const child of eachChild(accessToken, folderId)) {
    const path = pathPrefix ? `${pathPrefix}/${child.name}` : child.name;
    if (!isFolder(child)) {
      descendants.push({ file: child, path });
      continue;
    }
    descendants.push(...(await listDriveFilesRecursive(accessToken, child.id, path)));
  }
  return descendants;
}
