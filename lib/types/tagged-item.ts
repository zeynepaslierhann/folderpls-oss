/**
 * Tagged Item Type Definitions
 *
 * Types related to tagged items, notes, and file relations.
 */

/**
 * Note block - content block in file details
 */
export interface NoteBlock {
  id: string;
  type: "text" | "heading" | "todo" | "bullet" | "code";
  content: string;
  checked?: boolean; // For todo type
  createdAt: Date;
}

/**
 * File relation - link between files
 */
export interface FileRelation {
  targetFileId: string;
  relationType?: "reference" | "dependency" | "related" | "parent-child" | "version";
  note?: string;
  createdAt: Date;
}

/** The Drive object an entry points at; both IDs come from Drive. */
interface TrackedDriveObject extends Record<"itemId" | "name", string> {
  type: "file" | "folder";
  mimeType?: string;
  parentId?: string;
}

/**
 * Tagged item - file/folder with labels, properties, notes
 */
export interface TaggedItem extends TrackedDriveObject, Record<"addedAt" | "updatedAt", Date> {
  /** IDs from the label store. */
  labels: Array<string>;
  labelExpiries?: Record<string, number>; // Expiration timestamps for labels
  properties: Record<string, string | number | boolean | string[]>;
  notes: NoteBlock[];
  relations?: FileRelation[];
}
