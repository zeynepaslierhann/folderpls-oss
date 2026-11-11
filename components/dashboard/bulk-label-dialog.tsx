"use client";

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/i18n-context";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BulkLabelResult } from "@/lib/hooks/use-drive-operations/bulk-labels";
import type { LabelItem } from "@/lib/types/label";
import { Button } from "@/components/ui/button";
import {
  LabelSelector,
  useLabelSelection,
  labelSelectorProps,
} from "@/components/shared/label-selector";

type SaveBulkLabels = (
  fileIds: string[],
  labelIds: string[],
  newLabels: Omit<LabelItem, "id">[]
) => Promise<BulkLabelResult>;

type BulkLabelDialogProps = {
  open: boolean;
  fileIds: string[];
  existingLabels: LabelItem[];
  onClose: () => void;
  onSave: SaveBulkLabels;
};

type SaveStatus = { saving: boolean; errorText: string | null };

type RetryMemory = {
  /** Kısmi başarısızlıkta oluşturulan etiketler: tekrar denemede yeniden yaratılmaz (çift etiket olmasın). */
  createdIds: string[];
  /** File count of the first attempt, so the "ok" figure stays right across retries. */
  total: number;
};

const FRESH_RETRY: RetryMemory = { createdIds: [], total: 0 };

export function BulkLabelDialog(props: BulkLabelDialogProps) {
  const { open, onClose, fileIds, existingLabels, onSave } = props;
  const { t } = useI18n();
  const labelSelection = useLabelSelection();
  const { reset: resetLabelSelection } = labelSelection;
  const [{ saving: isSaving, errorText }, setStatus] = useState<SaveStatus>({ saving: false, errorText: null });
  const retryRef = useRef(FRESH_RETRY);

  useEffect(() => {
    if (!open) return;
    resetLabelSelection();
    setStatus((status) => ({ ...status, errorText: null }));
    retryRef.current = FRESH_RETRY;
  }, [open, resetLabelSelection]);

  /** Runs one save and returns the message to show, or null when there is nothing to report. */
  const attemptSave = async (selectedIds: string[], newLabels: Omit<LabelItem, "id">[]) => {
    const retry = retryRef.current;
    try {
      const { failedIds, createdLabelIds } = await onSave(
        fileIds,
        [...selectedIds, ...retry.createdIds],
        retry.createdIds.length > 0 ? [] : newLabels
      );
      if (failedIds.length === 0) {
        onClose();
        return null;
      }
      const latest = retryRef.current;
      retryRef.current = { ...latest, createdIds: [...latest.createdIds, ...createdLabelIds] };
      return t("dialogs.bulkLabel.partialFailed")
        .replace("{{ok}}", String(Math.max(latest.total - failedIds.length, 0)))
        .replace("{{failed}}", String(failedIds.length));
    } catch {
      return t("dialogs.bulkLabel.failed");
    }
  };

  const handleSave = async () => {
    const { selectedLabelIds, newLabelsToCreate } = labelSelection;
    if (selectedLabelIds.length + newLabelsToCreate.length + retryRef.current.createdIds.length === 0) {
      onClose();
      return;
    }
    setStatus({ saving: true, errorText: null });
    if (retryRef.current.total === 0) retryRef.current = { ...retryRef.current, total: fileIds.length };
    setStatus({ saving: false, errorText: await attemptSave(selectedLabelIds, newLabelsToCreate) });
  };

  const selectionCount = fileIds.length;
  if (!selectionCount) return null;

  const descriptionText = t("dialogs.bulkLabel.description").replace("{{count}}", `${selectionCount}`);
  const saveButtonText = isSaving ? t("dialogs.bulkLabel.saving") : t("common.save");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("dialogs.bulkLabel.title")}</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <LabelSelector
            existingLabels={existingLabels}
            {...labelSelectorProps(labelSelection)}
            showSelectedSection={false}
            labels={{
              existingLabels: t("dialogs.bulkLabel.labels"),
              searchPlaceholder: t("dialogs.bulkLabel.searchLabels"),
              labelNamePlaceholder: t("dialogs.bulkLabel.labelName"),
              add: t("dialogs.bulkLabel.add"),
              cancel: t("common.cancel"),
              createNew: t("dialogs.bulkLabel.newLabel"),
            }}
          />
        </div>

        {errorText && (
          <p role="alert" className="text-sm text-danger">
            {errorText}
          </p>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button disabled={isSaving} onClick={handleSave}>{saveButtonText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
