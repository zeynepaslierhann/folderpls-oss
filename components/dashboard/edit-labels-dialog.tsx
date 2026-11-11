"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/i18n-context";
import { logger } from "@/lib/logger";
import { PRESET_COLORS } from "@/lib/constants";
import { generateLabelId } from "@/lib/utils/id-generator";
import { LabelColorMenu } from "@/components/shared/label-selector/label-color-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddIcon, TagsIcon, DeleteIcon } from "@/components/icons";
import type { LabelItem } from "@/lib/types/label";

type EditLabelsDialogProps = {
  open: boolean;
  labels: LabelItem[];
  onClose: () => void;
  onUpdate: (updatedLabels: LabelItem[], deletedLabelIds: string[]) => Promise<void>;
};

type LabelsDraft = {
  rows: LabelItem[];
  removedIds: string[];
  /** Rows created in this dialog; they do not exist in storage yet. */
  addedIds: string[];
};

const EMPTY_DRAFT: LabelsDraft = { rows: [], removedIds: [], addedIds: [] };

const nameInputId = (labelId: string) => `edit-label-${labelId}`;

/** A row added in this dialog is dropped on save if it never got a name. */
function rowsToPersist({ rows, addedIds }: LabelsDraft) {
  const added = new Set(addedIds);
  return rows.filter((row) => !added.has(row.id) || row.name.trim() !== "");
}

type LabelRowProps = {
  label: LabelItem;
  onPatch: (changes: Partial<Omit<LabelItem, "id">>) => void;
  onDelete: () => void;
};

// Ad noktanın hemen yanında; sil düğmesi yalnız hover/odakta (dokunmatikte her zaman).
function LabelRow({ label, onPatch, onDelete }: LabelRowProps) {
  const { t } = useI18n();
  const inputId = nameInputId(label.id);
  const nameHint = t("dialogs.editLabels.labelName");

  return (
    <div className="group/label flex items-center rounded-md hover:bg-hover focus-within:bg-hover">
      <LabelColorMenu
        color={label.color}
        labelName={label.name || t("dashboard.panel.newLabelName")}
        onChange={(color) => onPatch({ color })}
      />
      <Input
        id={inputId}
        name={inputId}
        value={label.name}
        onChange={(event) => onPatch({ name: event.target.value })}
        className="h-8 flex-1 border-transparent bg-transparent pl-1 focus-visible:border-fg"
        placeholder={nameHint}
        aria-label={nameHint}
      />
      <Button
        variant="ghost"
        size="icon-md"
        onClick={onDelete}
        className="text-fg-3 opacity-0 hover:text-danger focus-visible:opacity-100 group-hover/label:opacity-100 group-focus-within/label:opacity-100 pointer-coarse:opacity-100"
        aria-label={t("dashboard.panel.deleteLabel").replace("{name}", label.name)}
      >
        <DeleteIcon className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

function NoLabelsYet({ onCreate }: { onCreate: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <TagsIcon className="mb-3 h-8 w-8 text-fg-3" aria-hidden="true" />
      <h3 className="text-lg font-semibold">{t("dashboard.panel.emptyLabelsTitle")}</h3>
      <p className="mt-1 text-sm text-fg-2">{t("dashboard.panel.emptyLabelsBody")}</p>
      <Button className="mt-4 gap-2" size="md" onClick={onCreate}>
        <AddIcon className="h-4 w-4" aria-hidden="true" />
        {t("dashboard.panel.createLabel")}
      </Button>
    </div>
  );
}

export function EditLabelsDialog(props: EditLabelsDialogProps) {
  const { open, onClose, labels, onUpdate } = props;
  const { t } = useI18n();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [isSaving, setIsSaving] = useState(false);
  const { rows: editedLabels, removedIds: deletedLabelIds, addedIds } = draft;

  useEffect(() => {
    if (open) setDraft({ ...EMPTY_DRAFT, rows: [...labels] });
  }, [open, labels]);

  const patchRow = (id: string, changes: Partial<Omit<LabelItem, "id">>) =>
    setDraft((current) => ({
      ...current,
      rows: current.rows.map((row) => (row.id === id ? { ...row, ...changes } : row)),
    }));

  const handleDeleteLabel = (id: string) =>
    setDraft((current) => {
      const rows = current.rows.filter((row) => row.id !== id);
      const wasAddedHere = current.addedIds.includes(id);
      return {
        rows,
        addedIds: wasAddedHere ? current.addedIds.filter((added) => added !== id) : current.addedIds,
        removedIds: wasAddedHere ? current.removedIds : [...current.removedIds, id],
      };
    });

  // "Create label": boş durumda ve listenin altında. Yeni satır kaydedilene
  // kadar yalnız yereldir; adı boş kalan yeni satırlar kaydedilmez.
  const handleAddLabel = () => {
    const id = generateLabelId();
    const color = PRESET_COLORS[editedLabels.length % PRESET_COLORS.length];
    setDraft((current) => ({
      ...current,
      rows: [...current.rows, { id, name: "", color }],
      addedIds: [...current.addedIds, id],
    }));
    requestAnimationFrame(() => document.getElementById(nameInputId(id))?.focus());
  };

  const hasChanges =
    deletedLabelIds.length > 0 ||
    addedIds.length > 0 ||
    editedLabels.some((l) => {
      const orig = labels.find((o) => o.id === l.id);
      return !orig || orig.name !== l.name || orig.color !== l.color;
    });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(rowsToPersist(draft), deletedLabelIds);
      onClose();
    } catch (err) {
      logger.error("Error updating labels:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("dashboard.panel.labels")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("dialogs.editLabels.description")}
          </DialogDescription>
        </DialogHeader>

        {editedLabels.length > 0 ? (
          <div className="-mx-2 max-h-[50vh] space-y-0.5 overflow-y-auto px-2">
            {editedLabels.map((label) => (
              <LabelRow
                key={label.id}
                label={label}
                onPatch={(changes) => patchRow(label.id, changes)}
                onDelete={() => handleDeleteLabel(label.id)}
              />
            ))}
            <Button variant="ghost" size="sm" className="mt-1 gap-1.5 text-fg-2" onClick={handleAddLabel}>
              <AddIcon className="h-4 w-4" aria-hidden="true" />
              {t("dashboard.panel.addLabel")}
            </Button>
          </div>
        ) : (
          <NoLabelsYet onCreate={handleAddLabel} />
        )}

        {(editedLabels.length > 0 || hasChanges) && (
          <DialogFooter>
            <Button variant="secondary" disabled={isSaving} onClick={onClose}>{t("common.cancel")}</Button>
            <Button disabled={!hasChanges} loading={isSaving} onClick={handleSave}>
              {t(isSaving ? "dialogs.editLabels.saving" : "common.save")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
