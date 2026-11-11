"use client";

import { LabelBadge } from "@/components/shared/label-selector/label-badge";
import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/i18n-context";
import { PRESET_COLORS, getRandomPresetColor } from "@/lib/constants";
import type { LabelItem } from "@/lib/types/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddIcon, PlannedIcon } from "@/components/icons";
import {
  LabelSelector,
  LabelColorPicker,
  useLabelSelection,
  labelSelectorProps,
} from "@/components/shared/label-selector";

type UnsavedLabel = Omit<LabelItem, "id">;

type CreateFolderOptions = {
  labelIds: string[];
  newLabels: UnsavedLabel[];
  plannedLabelIds?: string[];
  plannedNewLabels?: UnsavedLabel[];
  plannedExpiresAt?: number;
};

type CreateFolderDialogProps = {
  open: boolean;
  existingLabels: LabelItem[];
  onClose: () => void;
  onCreate: (name: string, options: CreateFolderOptions) => Promise<void>;
};

type PlannedDraft = {
  expanded: boolean;
  labelIds: string[];
  unsavedLabels: UnsavedLabel[];
  date: string;
  time: string;
  showMissingDateError: boolean;
  composing: boolean;
  composedName: string;
  composedColor: string;
};

const EMPTY_PLANNED_DRAFT: PlannedDraft = {
  expanded: false,
  labelIds: [],
  unsavedLabels: [],
  date: "",
  time: "",
  showMissingDateError: false,
  composing: false,
  composedName: "",
  composedColor: PRESET_COLORS[0],
};

type SetPlannedDraft = React.Dispatch<React.SetStateAction<PlannedDraft>>;

type LabeledInputProps = React.ComponentProps<typeof Input> & {
  label: string;
  labelClassName?: string;
  error?: string | null;
};

function LabeledInput({ label, labelClassName, error, ...inputProps }: LabeledInputProps) {
  return (
    <div>
      <Label htmlFor={inputProps.id} className={labelClassName}>{label}</Label>
      <Input className="mt-1" {...inputProps} />
      {error ? <p className="text-sm text-danger mt-1">{error}</p> : null}
    </div>
  );
}

function PlannedLabelComposer({ draft, setDraft }: { draft: PlannedDraft; setDraft: SetPlannedDraft }) {
  const { t } = useI18n();
  const composedName = draft.composedName.trim();

  const commit = () => {
    if (!composedName) return;
    const nextColor = getRandomPresetColor();
    setDraft((current) => ({
      ...current,
      unsavedLabels: [...current.unsavedLabels, { name: composedName, color: current.composedColor }],
      composing: false,
      composedName: "",
      composedColor: nextColor,
    }));
  };

  const abandon = () => setDraft((current) => ({ ...current, composing: false, composedName: "" }));

  // The disabled submit button also stops Enter from committing an empty name.
  return (
    <form
      className="inline-flex flex-col gap-1.5 rounded-md border border-line p-2"
      onSubmit={(event) => {
        event.preventDefault();
        commit();
      }}
    >
      <Input
        autoFocus
        className="h-7 w-40 text-sm"
        placeholder={t("dialogs.createFolder.plannedLabelName")}
        value={draft.composedName}
        onChange={(event) => {
          const { value } = event.target;
          setDraft((current) => ({ ...current, composedName: value }));
        }}
      />
      <LabelColorPicker
        selectedColor={draft.composedColor}
        onColorSelect={(color) => setDraft((current) => ({ ...current, composedColor: color }))}
        className="gap-1"
      />
      <div className="flex gap-1">
        <Button type="submit" size="sm" disabled={!composedName}>{t("dialogs.bulkLabel.add")}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={abandon}>{t("common.cancel")}</Button>
      </div>
    </form>
  );
}

function PlannedContentPanel({
  draft,
  setDraft,
  existingLabels,
}: {
  draft: PlannedDraft;
  setDraft: SetPlannedDraft;
  existingLabels: LabelItem[];
}) {
  const { t } = useI18n();
  const earliestDate = new Date().toISOString().split("T")[0];

  const toggleLabel = (labelId: string) =>
    setDraft((current) => {
      const nextIds = new Set(current.labelIds);
      if (!nextIds.delete(labelId)) nextIds.add(labelId);
      return { ...current, labelIds: [...nextIds] };
    });

  const dropUnsavedLabel = (position: number) =>
    setDraft((current) => ({
      ...current,
      unsavedLabels: current.unsavedLabels.filter((_, index) => index !== position),
    }));

  return (
    <div className="space-y-3 rounded-lg border border-line p-3">
      {draft.showMissingDateError && (
        <p className="text-sm text-danger">{t("dialogs.createFolder.plannedContentError")}</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <LabeledInput
          label={t("dialogs.createFolder.date")}
          labelClassName="text-xs"
          type="date"
          min={earliestDate}
          value={draft.date}
          onChange={(event) => {
            const { value } = event.target;
            setDraft((current) => ({ ...current, date: value }));
          }}
        />
        <LabeledInput
          label={t("dialogs.createFolder.time")}
          labelClassName="text-xs"
          type="time"
          value={draft.time}
          onChange={(event) => {
            const { value } = event.target;
            setDraft((current) => ({ ...current, time: value }));
          }}
        />
      </div>
      <div>
        <Label className="text-xs mb-1 block">{t("dialogs.createFolder.labelRemovedAfter")}</Label>
        <div className="flex flex-wrap gap-1">
          {existingLabels.map((label) => {
            const isPicked = draft.labelIds.includes(label.id);
            return (
              <LabelBadge
                key={label.id}
                size="sm"
                label={label}
                selected={isPicked}
                showCheck={isPicked}
                onClick={() => toggleLabel(label.id)}
              />
            );
          })}
          {draft.unsavedLabels.map((label, position) => (
            <LabelBadge key={position} size="sm" label={label} selected onRemove={() => dropUnsavedLabel(position)} />
          ))}
          {draft.composing ? (
            <PlannedLabelComposer draft={draft} setDraft={setDraft} />
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("dialogs.bulkLabel.newLabel")}
              onClick={() => setDraft((current) => ({ ...current, composing: true }))}
            >
              <AddIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function PlannedContentDisclosure({
  draft,
  setDraft,
  existingLabels,
}: {
  draft: PlannedDraft;
  setDraft: SetPlannedDraft;
  existingLabels: LabelItem[];
}) {
  const { t } = useI18n();
  const toggle = () => setDraft((current) => ({ ...current, expanded: !current.expanded }));

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2.5 gap-2 text-fg-2 hover:text-fg aria-expanded:text-fg"
        aria-expanded={draft.expanded}
        onClick={toggle}
      >
        <PlannedIcon className="h-4 w-4" aria-hidden="true" />
        {t("dialogs.createFolder.plannedContent")}
      </Button>
      {draft.expanded ? <PlannedContentPanel draft={draft} setDraft={setDraft} existingLabels={existingLabels} /> : null}
    </div>
  );
}

export function CreateFolderDialog(props: CreateFolderDialogProps) {
  const { open, onClose, existingLabels, onCreate } = props;
  const { t } = useI18n();
  const [folderName, setFolderName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [planned, setPlanned] = useState(EMPTY_PLANNED_DRAFT);

  // Main label selection
  const labelSelection = useLabelSelection();
  const { reset: resetLabelSelection } = labelSelection;

  useEffect(() => {
    if (!open) return;
    setFolderName("");
    setErrorText(null);
    resetLabelSelection();
    // The colour picked for the next planned label carries over between opens.
    setPlanned((current) => ({ ...EMPTY_PLANNED_DRAFT, composedColor: current.composedColor }));
  }, [open, resetLabelSelection]);

  const trimmedName = folderName.trim();

  const submit = async () => {
    if (!trimmedName) {
      setErrorText(t("dialogs.createFolder.enterFolderName"));
      return;
    }

    const schedule = planned.expanded && planned.date && planned.time
      ? new Date(`${planned.date}T${planned.time}`).getTime()
      : undefined;
    const plansAnyLabel = planned.labelIds.length + planned.unsavedLabels.length > 0;
    const isMissingDate = planned.expanded && plansAnyLabel && !schedule;

    setPlanned((current) => ({ ...current, showMissingDateError: isMissingDate }));
    if (isMissingDate) return;

    setErrorText(null);
    setIsSubmitting(true);
    try {
      await onCreate(trimmedName, {
        labelIds: labelSelection.selectedLabelIds,
        newLabels: labelSelection.newLabelsToCreate,
        plannedExpiresAt: schedule,
        ...(planned.expanded && {
          plannedLabelIds: planned.labelIds,
          plannedNewLabels: planned.unsavedLabels,
        }),
      });
      onClose();
    } catch {
      setErrorText(t("dialogs.createFolder.errorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("dialogs.createFolder.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <LabeledInput
            id="folder-name"
            label={t("dialogs.createFolder.folderName")}
            error={errorText}
            autoFocus
            disabled={isSubmitting}
            placeholder={t("dialogs.createFolder.newFolder")}
            value={folderName}
            onChange={(event) => {
              setErrorText(null);
              setFolderName(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
          />

          <div>
            <Label className="mb-2 block text-sm font-medium">{t("dialogs.createFolder.addLabelsOptional")}</Label>
            <LabelSelector
              existingLabels={existingLabels}
              {...labelSelectorProps(labelSelection)}
              showSelectedSection={false}
              showExistingHeading={false}
              labels={{
                searchPlaceholder: t("dialogs.createFolder.searchLabels"),
                labelNamePlaceholder: t("dialogs.bulkLabel.labelName"),
                add: t("dialogs.bulkLabel.add"),
                cancel: t("common.cancel"),
                createNew: t("dialogs.bulkLabel.newLabel"),
              }}
            />
          </div>

          <PlannedContentDisclosure draft={planned} setDraft={setPlanned} existingLabels={existingLabels} />
        </div>
        <DialogFooter>
          <Button variant="secondary" disabled={isSubmitting} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button disabled={isSubmitting || !trimmedName} onClick={submit}>
            {isSubmitting ? t("dialogs.createFolder.creating") : t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
