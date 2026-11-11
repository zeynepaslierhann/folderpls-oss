import type { DriveFile, LabelItem, PropertyDefinition, NoteBlock, FileRelation } from "@/lib/types";

export type { LabelItem };

export interface FileDetailsPanelProps {
  file: DriveFile;
  onClose: () => void;
  userLabels: LabelItem[];
  itemLabels: string[];
  propertyDefinitions: PropertyDefinition[];
  itemProperties: Record<string, string | number | boolean | string[]>;
  itemNotes: NoteBlock[];
  itemRelations: FileRelation[];
  availableFiles: DriveFile[];
  onUpdate: () => void;
}

export type TabType = "properties" | "notes" | "relations";
