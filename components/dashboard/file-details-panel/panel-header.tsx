"use client";

import { CloseIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { FileTypeIcon } from "@/components/dashboard/file-item/file-type";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { DriveFile } from "@/lib/types";

interface PanelHeaderProps {
  file: DriveFile;
  onClose: () => void;
}

export function PanelHeader({ file, onClose }: PanelHeaderProps) {
  const { t } = useI18n();
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line pl-4 pr-2">
      <FileTypeIcon file={file} />
      <h2 className="min-w-0 flex-1 truncate text-base font-semibold" title={file.name}>
        {file.name}
      </h2>
      <Button variant="ghost" size="icon-md" onClick={onClose} aria-label={t("common.close")}>
        <CloseIcon className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
