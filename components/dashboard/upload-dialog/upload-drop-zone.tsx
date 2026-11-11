"use client";

import { useI18n } from "@/lib/i18n/i18n-context";
import { Button } from "@/components/ui/button";
import { UploadIcon } from "@/components/icons";

interface UploadDropZoneProps {
  isDragging: boolean;
  isUploading: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onSelectFiles: () => void;
}

export function UploadDropZone({
  isDragging,
  isUploading,
  onDragOver,
  onDragLeave,
  onDrop,
  onSelectFiles,
}: UploadDropZoneProps) {
  const { t } = useI18n();

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`rounded-lg border border-dashed p-6 text-center transition-colors duration-[var(--dur-fast)] ${
        isDragging ? "border-control bg-accent-soft" : "border-control"
      }`}
    >
      <UploadIcon className="mx-auto mb-2 h-8 w-8 text-fg-3" aria-hidden="true" />
      <p className="mb-3 text-sm text-fg-2">
        {t("dialogs.upload.dropHere")}
      </p>
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={onSelectFiles}
        disabled={isUploading}
      >
        {t("dialogs.upload.selectFiles")}
      </Button>
    </div>
  );
}
