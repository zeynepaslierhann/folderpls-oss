/**
 * Google Drive Type Definitions
 *
 * Types related to Google Drive API responses and operations.
 */

/** URLs Drive hands back when the request's `fields` mask asks for them. */
interface DriveFileLinks {
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
}

/**
 * Google Drive file/folder metadata
 */
export interface DriveFile extends DriveFileLinks, Record<"id" | "name" | "mimeType", string> {
  /** Decimal byte count; Drive sends it as text. */
  size?: string;
  parents?: string[];
  /** RFC 3339 timestamps. */
  createdTime?: string;
  modifiedTime?: string;
  shared?: boolean;
  trashed?: boolean;
}

/** One page of a Drive list call; a token is present while more pages remain. */
interface DrivePage {
  nextPageToken?: string;
}

/**
 * Google Drive list files response
 */
export interface DriveListResponse extends DrivePage {
  files: Array<DriveFile>;
}

/**
 * Google Drive storage quota
 */
export interface DriveStorageQuota {
  limit: number | null; // null = unlimited (e.g., some Workspace accounts)
  usage: number;
}

/**
 * Shared Drive metadata
 */
export interface SharedDrive extends Pick<DriveFile, "id" | "name"> {
  capabilities?: {
    canListChildren?: boolean;
  };
}

/**
 * Shared Drive list response
 */
export interface SharedDriveListResponse extends DrivePage {
  drives: Array<SharedDrive>;
}
