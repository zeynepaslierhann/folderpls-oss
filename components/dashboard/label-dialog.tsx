"use client";

import { LabelBadge } from "@/components/shared/label-selector/label-badge";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlannedIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { LabelItem } from "@/lib/types/label";
import {
  LabelSelector,
  useLabelSelection,
  labelSelectorProps,
} from "@/components/shared/label-selector";

type LabelDialogProps = {
  /** Only id and name are read, so any file-like item works here. */
  file: { id: string; name: string } | null;
  open: boolean;
  existingLabels: LabelItem[];
  /** Ids of the labels the file already has. */
  fileLabels: string[];
  onClose: () => void;
  onSave: (
    fileId: string,
    labelIds: string[],
    newLabels: Omit<LabelItem, "id">[],
    options?: { labelExpiries?: Record<string, number> }
  ) => void;
};

type ScheduleDraft = {
  isOpen: boolean;
  date: string;
  time: string;
  labelIds: string[];
};

const EMPTY_SCHEDULE: ScheduleDraft = { isOpen: false, date: "", time: "", labelIds: [] };

function expiriesFromSchedule({ isOpen, date, time, labelIds }: ScheduleDraft) {
  if (!isOpen || labelIds.length === 0 || !date || !time) return undefined;
  const expiresAt = new Date(`${date}T${time}`).getTime();
  return Object.fromEntries(labelIds.map((id): [string, number] => [id, expiresAt]));
}

const SCHEDULE_INPUTS = ["date", "time"] as const;

function ScheduleField({ label, ...inputProps }: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input className="mt-1" {...inputProps} />
    </div>
  );
}

type LabelExpiryPlannerProps = {
  schedule: ScheduleDraft;
  /** Labels that can expire: the existing ones currently selected for the file. */
  candidates: LabelItem[];
  onChange: (changes: Partial<ScheduleDraft>) => void;
  onToggleLabel: (labelId: string) => void;
};

function LabelExpiryPlanner({ schedule, candidates, onChange, onToggleLabel }: LabelExpiryPlannerProps) {
  const { t } = useI18n();
  const today = new Date().toISOString().split("T")[0];
  const scheduledIds = new Set(schedule.labelIds);

  return (
    <div className="mt-4 space-y-2">
      <Button
        type="button"
        size="sm"
        className="w-full justify-start"
        variant={schedule.isOpen ? "secondary" : "outline"}
        onClick={() => onChange({ isOpen: !schedule.isOpen })}
      >
        <PlannedIcon className="w-4 h-4 mr-2" />
        {t("dialogs.addLabel.planned")}
      </Button>
      {schedule.isOpen && (
        <div className="p-3 rounded-lg border bg-muted/40 dark:bg-muted/20 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {SCHEDULE_INPUTS.map((kind) => (
              <ScheduleField
                key={kind}
                label={t(`dialogs.addLabel.${kind}`)}
                type={kind}
                min={kind === "date" ? today : undefined}
                value={schedule[kind]}
                onChange={(event) => onChange({ [kind]: event.target.value })}
              />
            ))}
          </div>
          <div>
            <Label className="text-xs mb-1 block">{t("dialogs.addLabel.plannedLabels")}</Label>
            <div className="flex flex-wrap gap-1">
              {candidates.map((label) => (
                <LabelBadge
                  key={label.id}
                  size="sm"
                  label={label}
                  selected={scheduledIds.has(label.id)}
                  showCheck={scheduledIds.has(label.id)}
                  onClick={() => onToggleLabel(label.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function LabelDialog(props: LabelDialogProps) {
  const { file, open, onClose, existingLabels, fileLabels, onSave } = props;
  const { t } = useI18n();
  const labelSelection = useLabelSelection({
    initialSelectedIds: fileLabels,
  });
  const { selectedLabelIds, newLabelsToCreate, reset: resetLabelSelection } = labelSelection;
  const [schedule, setSchedule] = useState(EMPTY_SCHEDULE);

  useEffect(() => {
    if (!open || !fileLabels) return;
    const timer = setTimeout(() => {
      resetLabelSelection(fileLabels);
      setSchedule(EMPTY_SCHEDULE);
    }, 0);
    return () => clearTimeout(timer);
  }, [open, fileLabels, resetLabelSelection]);

  if (!file) return null;

  const updateSchedule = (changes: Partial<ScheduleDraft>) =>
    setSchedule((current) => ({ ...current, ...changes }));

  const toggleScheduledLabel = (labelId: string) =>
    setSchedule((current) => {
      const nextIds = new Set(current.labelIds);
      if (!nextIds.delete(labelId)) nextIds.add(labelId);
      return { ...current, labelIds: [...nextIds] };
    });

  const handleSave = () => {
    const labelExpiries = expiriesFromSchedule(schedule);
    onSave(file.id, selectedLabelIds, newLabelsToCreate, { labelExpiries });
    onClose();
  };

  const selectedIds = new Set(selectedLabelIds);
  const schedulableLabels = existingLabels.filter(({ id }) => selectedIds.has(id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("dialogs.addLabel.title")}</DialogTitle>
          <DialogDescription className="sr-only">{t("dialogs.addLabel.description")}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4 truncate">
            {t("dialogs.addLabel.forFile").split("{name}").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && <span className="font-medium text-foreground">{file.name}</span>}
              </span>
            ))}
          </p>

          <LabelSelector existingLabels={existingLabels} {...labelSelectorProps(labelSelection)} />

          <LabelExpiryPlanner
            schedule={schedule}
            candidates={schedulableLabels}
            onChange={updateSchedule}
            onToggleLabel={toggleScheduledLabel}
          />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleSave}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
