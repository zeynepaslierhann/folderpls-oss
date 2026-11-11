"use client";

import { useI18n } from "@/lib/i18n/i18n-context";
import { formatDateTime, formatFileSize } from "@/lib/utils";
import type { DriveFile } from "@/lib/types";

interface PanelFooterProps {
  file: DriveFile;
}

/** Dosya bilgisi: tarih her yerde tek biçim (formatDateTime → "Sep 27, 2026, 14:05"). */
export function PanelFooter({ file }: PanelFooterProps) {
  const { t } = useI18n();
  return (
    <div className="mt-auto border-t border-line p-4">
      <h3 className="mb-2 text-xs font-medium text-fg-3">{t("dashboard.fileDetails")}</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-fg-2">{t("dashboard.created")}</dt>
        <dd className="truncate text-right tabular-nums">{formatDateTime(file.createdTime)}</dd>
        <dt className="text-fg-2">{t("dashboard.modified")}</dt>
        <dd className="truncate text-right tabular-nums">{formatDateTime(file.modifiedTime)}</dd>
        <dt className="text-fg-2">{t("dashboard.size")}</dt>
        <dd className="truncate text-right tabular-nums">{file.size ? formatFileSize(file.size) : "—"}</dd>
      </dl>
    </div>
  );
}
