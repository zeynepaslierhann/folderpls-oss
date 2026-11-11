import { FILE_TYPE_ICONS } from "@/components/icons/file-types";
import { isFolder, getFileIcon, type DriveFile } from "@/lib/google-drive/google-drive";
import { cn } from "@/lib/utils";

/** Dosya adından bağımsız, MIME türünden bilinen etiket anahtarları. */
const GOOGLE_EDITOR_LABEL_KEYS: Record<string, string> = {
  "application/vnd.google-apps.spreadsheet": "dashboard.fileTypeGoogleSheet",
  "application/vnd.google-apps.document": "dashboard.fileTypeGoogleDoc",
  "application/vnd.google-apps.form": "dashboard.fileTypeGoogleForms",
  "application/vnd.google-apps.presentation": "dashboard.fileTypeGoogleSlides",
};

const MEDIA_LABEL_KEYS = [
  ["audio/", "dashboard.fileTypeAudio"],
  ["image/", "dashboard.fileTypeImage"],
  ["video/", "dashboard.fileTypeVideo"],
] as const;

function knownTypeLabelKey(mimeType: string): string | undefined {
  return (
    GOOGLE_EDITOR_LABEL_KEYS[mimeType] ??
    MEDIA_LABEL_KEYS.find(([prefix]) => mimeType.startsWith(prefix))?.[1]
  );
}

/** Dosya türü ikonu: tek renk --fg-2 (spec §3: dosya türü rengi yok). */
export function FileTypeIcon({ file, className }: { file: DriveFile; className?: string }) {
  const Icon = FILE_TYPE_ICONS[getFileIcon(file.mimeType)];
  return <Icon className={cn("h-4 w-4 shrink-0 text-fg-2", className)} aria-hidden="true" />;
}

/** "Folder", "PDF", "Google Docs", "DOCX"… — ad üzerinde `title` ve mobil meta satırında. */
export function getFileTypeLabel(file: DriveFile, t: (key: string) => string): string {
  if (isFolder(file)) return t("common.folder");
  if (file.mimeType === "application/pdf") return "PDF";
  const knownKey = knownTypeLabelKey(file.mimeType);
  if (knownKey) return t(knownKey);
  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toUpperCase() : undefined;
  return extension || t("common.file");
}
