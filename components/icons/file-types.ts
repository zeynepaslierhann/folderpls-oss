import type { FileIconKind } from "@/lib/google-drive/helpers/file-utils";
import {
  AudioIcon,
  DocumentIcon,
  FileIcon,
  FolderIcon,
  ImageIcon,
  PresentationIcon,
  SpreadsheetIcon,
  VideoIcon,
  type IconComponent,
} from "./index";

/** Dosya türü → ikon: panel, arama, önizleme ve grafik tek eşlemeden okur. */
export const FILE_TYPE_ICONS: Record<FileIconKind, IconComponent> = {
  folder: FolderIcon,
  image: ImageIcon,
  video: VideoIcon,
  audio: AudioIcon,
  pdf: DocumentIcon,
  document: DocumentIcon,
  spreadsheet: SpreadsheetIcon,
  presentation: PresentationIcon,
  file: FileIcon,
};
