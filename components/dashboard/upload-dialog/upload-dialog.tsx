"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n/i18n-context";
import { logger } from "@/lib/logger";
import { usePlannedContent } from "@/lib/hooks/use-planned-content";
import type { DropFileEntry } from "@/lib/utils/drop-utils";
import type { LabelItem } from "@/lib/types/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadIcon } from "@/components/icons";
import { PlannedContentSection } from "@/components/shared/planned-content-section";
import { UploadDropZone } from "./upload-drop-zone";
import { UploadFileList } from "./upload-file-list";
import { UploadLabelSelector } from "./upload-label-selector";
import { UploadProgress } from "./upload-progress";

type UnsavedLabel = Omit<LabelItem, "id">;

type UploadOptions = {
  labelIds: string[];
  newLabels: UnsavedLabel[];
  plannedLabelIds?: string[];
  plannedNewLabels?: UnsavedLabel[];
  plannedExpiresAt?: number;
  onProgress?: (progress: number) => void;
};

type UploadDialogProps = {
  open: boolean;
  currentFolderId: string | null;
  existingLabels: LabelItem[];
  initialEntries?: DropFileEntry[] | null;
  onClose: () => void;
  onUpload: (files: File[], options: UploadOptions, filePaths?: string[]) => Promise<void>;
};

type LabelPicks = { selectedLabelIds: string[]; newLabelsToCreate: UnsavedLabel[] };

const NO_LABEL_PICKS: LabelPicks = { selectedLabelIds: [], newLabelsToCreate: [] };

type UploadRun = { active: boolean; percent: number };

const IDLE_RUN: UploadRun = { active: false, percent: 0 };

const fileIdentity = (file: File) => `${file.name}${file.size}`;

const isDotfile = (file: File) => file.name.startsWith(".");

function withoutIndex<T>(items: T[], position: number) {
  return items.filter((_, index) => index !== position);
}

export function UploadDialog(props: UploadDialogProps) {
  const { open, onClose, existingLabels, initialEntries, onUpload } = props;
  const { t } = useI18n();
  const plannedContent = usePlannedContent();

  const [entries, setEntries] = useState<DropFileEntry[]>([]);
  const files = entries.map(({ file }) => file);
  const fileRelativePaths = entries.map(({ relativePath }) => relativePath);

  const [isDragging, setIsDragging] = useState(false);
  const appliedInitialRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [labelPicks, setLabelPicks] = useState(NO_LABEL_PICKS);
  const { selectedLabelIds, newLabelsToCreate } = labelPicks;

  const [{ active: isUploading, percent: uploadProgress }, setRun] = useState(IDLE_RUN);

  // Files dropped before the dialog opened arrive through initialEntries.
  useEffect(() => {
    if (!open) {
      appliedInitialRef.current = false;
      return;
    }
    if (appliedInitialRef.current || !initialEntries?.length) return;
    appliedInitialRef.current = true;
    setEntries(initialEntries);
  }, [open, initialEntries]);

  const clearAndClose = () => {
    setEntries([]);
    setLabelPicks(NO_LABEL_PICKS);
    plannedContent.reset();
    onClose();
  };

  const handleClose = () => {
    if (!isUploading) clearAndClose();
  };

  const appendFiles = (incoming: File[]) => {
    const known = new Set(files.map(fileIdentity));
    const additions = incoming.filter((file) => !isDotfile(file) && !known.has(fileIdentity(file)));
    setEntries((current) => [...current, ...additions.map((file) => ({ file, relativePath: file.name }))]);
  };

  const dragHandler = (isOver: boolean) => (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(isOver);
  };

  const handleDrop = (event: React.DragEvent) => {
    dragHandler(false)(event);
    appendFiles(Array.from(event.dataTransfer.files));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    if (!input.files?.length) return;
    appendFiles(Array.from(input.files));
    input.value = "";
  };

  const removeFile = (index: number) => setEntries((current) => withoutIndex(current, index));

  const toggleLabel = (labelId: string) =>
    setLabelPicks((picks) => {
      const nextIds = new Set(picks.selectedLabelIds);
      if (!nextIds.delete(labelId)) nextIds.add(labelId);
      return { ...picks, selectedLabelIds: [...nextIds] };
    });

  const addNewLabel = (label: UnsavedLabel) =>
    setLabelPicks((picks) => ({ ...picks, newLabelsToCreate: [...picks.newLabelsToCreate, label] }));

  const removeNewLabel = (index: number) =>
    setLabelPicks((picks) => ({ ...picks, newLabelsToCreate: withoutIndex(picks.newLabelsToCreate, index) }));

  const handleUpload = async () => {
    if (entries.length === 0 || !plannedContent.validate()) return;

    setRun({ active: true, percent: 0 });
    try {
      await onUpload(
        files,
        {
          labelIds: selectedLabelIds,
          newLabels: newLabelsToCreate,
          ...plannedContent.getPlannedContentData(),
          onProgress: (percent) => setRun((run) => ({ ...run, percent })),
        },
        fileRelativePaths
      );
      clearAndClose();
    } catch (err) {
      logger.error("Upload failed:", err);
      throw err;
    } finally {
      setRun(IDLE_RUN);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
    >
      <DialogContent
        className="max-w-xl"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{t("dialogs.upload.title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {`${t("dialogs.upload.dropHere")} ${t("dialogs.upload.selectFiles")}`}
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Drop Zone */}
        <UploadDropZone
          isDragging={isDragging}
          isUploading={isUploading}
          onDragOver={dragHandler(true)}
          onDragLeave={dragHandler(false)}
          onDrop={handleDrop}
          onSelectFiles={() => fileInputRef.current?.click()}
        />

        {/* File List */}
        <UploadFileList
          files={files}
          fileRelativePaths={fileRelativePaths}
          isUploading={isUploading}
          onRemoveFile={removeFile}
        />

        {/* Label Selector */}
        <UploadLabelSelector
          existingLabels={existingLabels}
          selectedLabelIds={selectedLabelIds}
          newLabelsToCreate={newLabelsToCreate}
          onToggleLabel={toggleLabel}
          onAddNewLabel={addNewLabel}
          onRemoveNewLabel={removeNewLabel}
        />

        {/* Planned Content */}
        <PlannedContentSection
          plannedContent={plannedContent}
          existingLabels={existingLabels}
          translationPrefix="dialogs.upload"
        />

        {/* Upload Progress */}
        {isUploading && <UploadProgress progress={uploadProgress} />}

        {/* Footer */}
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={isUploading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleUpload} disabled={files.length === 0} loading={isUploading} className="gap-2">
            <UploadIcon className="h-4 w-4" aria-hidden="true" />
            {isUploading ? t("dialogs.upload.uploading") : t("common.upload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
