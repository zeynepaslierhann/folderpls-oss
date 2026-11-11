"use client";

import { useI18n } from "@/lib/i18n/i18n-context";
import { formatFileSize } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileIcon, CloseIcon } from "@/components/icons";

interface UploadFileListProps {
  files: File[];
  fileRelativePaths: string[];
  isUploading: boolean;
  onRemoveFile: (index: number) => void;
}

function FileNameCell({ name, relativePath }: { name: string; relativePath?: string }) {
  const distinctPath = relativePath !== name ? relativePath : undefined;
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-sm">{name}</span>
      {distinctPath ? <span className="truncate text-sm text-fg-3">{distinctPath}</span> : null}
    </span>
  );
}

export function UploadFileList({
  files,
  fileRelativePaths,
  isUploading,
  onRemoveFile,
}: UploadFileListProps) {
  const { t } = useI18n();

  if (files.length === 0) return null;

  const heading = `${t("dialogs.upload.selectedFiles")} (${files.length})`;

  return (
    <div>
      <Label className="mb-2 block text-sm font-medium">{heading}</Label>
      <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-md border border-line p-1">
        {files.map((file, i) => (
          <div
            key={`${file.name}-${i}`}
            className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-hover"
          >
            <FileIcon className="h-4 w-4 shrink-0 text-fg-2" aria-hidden="true" />
            <FileNameCell name={file.name} relativePath={fileRelativePaths[i]} />
            <span className="shrink-0 text-sm tabular-nums text-fg-2">{formatFileSize(file.size)}</span>
            <Button
              className="text-fg-3 hover:text-danger"
              size="icon-sm"
              type="button"
              variant="ghost"
              onClick={() => onRemoveFile(i)}
              disabled={isUploading}
              aria-label={`${t("common.delete")}: ${file.name}`}
            >
              <CloseIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
