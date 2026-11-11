/**
 * View Mode Constants
 *
 * Centralized string constants for all dashboard view modes.
 * Use these instead of raw string literals to avoid typos and
 * enable IDE refactoring support.
 */

export const VIEW_MODES = {
  NORMAL: "normal",
  TAGGED_FILES: "taggedFiles",
  TAGGED_FOLDERS: "taggedFolders",
  EDIT_LABELS: "editLabels",
  SEARCH: "search",
  TRASH: "trash",
  MANAGE_PROPERTIES: "manageProperties",
  GRAPH: "graph",
  SHARED_WITH_ME: "sharedWithMe",
  SHARED_DRIVES: "sharedDrives",
  SHARED_DRIVE_FOLDER: "sharedDriveFolder",
  COLLECTION: "collection",
} as const;

export type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES];
