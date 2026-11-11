"use client";

import { Progress } from "@/components/ui/loading";
import { useI18n } from "@/lib/i18n/i18n-context";

interface UploadProgressProps {
  progress: number;
}

/** Yükleme ilerlemesi: tek Progress (4px çubuk + metin); maskot animasyonu yok. */
export function UploadProgress({ progress }: UploadProgressProps) {
  const { t } = useI18n();
  const pct = Math.min(100, Math.max(0, progress));
  return <Progress value={pct} total={100} label={`${t("dialogs.upload.uploading")} ${pct}%`} className="py-2" />;
}
