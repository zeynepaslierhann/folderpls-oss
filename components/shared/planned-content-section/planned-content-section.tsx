"use client";

import { LabelBadge } from "@/components/shared/label-selector/label-badge";
import { useI18n } from "@/lib/i18n/i18n-context";
import { LabelColorPicker } from "@/components/shared/label-selector/label-color-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlannedIcon, AddIcon } from "@/components/icons";
import type { UsePlannedContentReturn } from "@/lib/hooks/use-planned-content";
import type { LabelItem } from "@/lib/types";

export interface PlannedContentSectionProps {
  plannedContent: UsePlannedContentReturn;
  existingLabels: LabelItem[];
  /** Translation key prefix for labels (e.g., "dialogs.upload" or "dialogs.createFolder") */
  translationPrefix?: string;
}

/** Planlı içerik için yeni etiket adı ve rengi. */
function PlannedLabelForm({
  plannedContent,
  translationPrefix,
}: {
  plannedContent: UsePlannedContentReturn;
  translationPrefix: string;
}) {
  const { t } = useI18n();
  const closeForm = () => {
    plannedContent.setIsCreatingLabel(false);
    plannedContent.setNewLabelName("");
  };

  return (
    <div className="inline-flex flex-col gap-1.5 rounded-md border border-line p-2">
      <Input
        value={plannedContent.newLabelName}
        onChange={(e) => plannedContent.setNewLabelName(e.target.value)}
        placeholder={t(`${translationPrefix}.plannedLabelName`)}
        className="h-7 w-40 text-sm"
        autoFocus
        onKeyDown={(e) => e.key === "Enter" && plannedContent.addNewLabel()}
      />
      <LabelColorPicker
        selectedColor={plannedContent.newLabelColor}
        onColorSelect={plannedContent.setNewLabelColor}
      />
      <div className="flex gap-1">
        <Button type="button" size="sm" onClick={plannedContent.addNewLabel} disabled={!plannedContent.newLabelName.trim()}>
          {t("dialogs.bulkLabel.add")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={closeForm}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Shared component for planned content section in dialogs
 * Displays toggle button, date/time pickers, and label selection
 */
export function PlannedContentSection({
  plannedContent,
  existingLabels,
  translationPrefix = "dialogs.upload",
}: PlannedContentSectionProps) {
  const { t } = useI18n();
  const [minDate] = new Date().toISOString().split("T");

  return (
    <div className="space-y-2">
      {/* İkincil seçenek: tam genişlikte, input'a benzeyen bir düğme değil,
          sola hizalı sakin bir açma/kapama. */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={plannedContent.enabled}
        onClick={plannedContent.toggleEnabled}
        className="-ml-2.5 gap-2 text-fg-2 hover:text-fg aria-expanded:text-fg"
      >
        <PlannedIcon className="h-4 w-4" aria-hidden="true" />
        {t(`${translationPrefix}.plannedContent`)}
      </Button>

      {plannedContent.enabled && (
        <div className="space-y-3 rounded-lg border border-line p-3">
          {plannedContent.hasError && (
            <p className="text-sm text-danger">
              {t(`${translationPrefix}.plannedContentError`)}
            </p>
          )}

          {/* Date/Time Pickers */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{t(`${translationPrefix}.date`)}</Label>
              <Input
                type="date"
                value={plannedContent.expiresDate}
                onChange={(e) => plannedContent.setExpiresDate(e.target.value)}
                min={minDate}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">{t(`${translationPrefix}.time`)}</Label>
              <Input
                type="time"
                value={plannedContent.expiresTime}
                onChange={(e) => plannedContent.setExpiresTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Label Selection */}
          <div>
            <Label className="text-xs mb-1 block">
              {t(`${translationPrefix}.labelRemovedAfter`)}
            </Label>
            <div className="flex flex-wrap gap-1">
              {/* Existing Labels */}
              {existingLabels.map((label) => (
                <LabelBadge
                        key={label.id}
                        size="sm"
                        label={label}
                        selected={plannedContent.labelIds.includes(label.id)}
                        showCheck={plannedContent.labelIds.includes(label.id)}
                        onClick={() => plannedContent.toggleLabel(label.id)}
                      />
              ))}

              {/* New Labels */}
              {plannedContent.newLabels.map((label, i) => (
                <LabelBadge key={i} size="sm" label={label} selected onRemove={() => plannedContent.removeNewLabel(i)} />
              ))}

              {/* Create New Label */}
              {plannedContent.isCreatingLabel ? (
                <PlannedLabelForm plannedContent={plannedContent} translationPrefix={translationPrefix} />
              ) : (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  type="button"
                  aria-label={t("dialogs.bulkLabel.newLabel")}
                  onClick={() => plannedContent.setIsCreatingLabel(true)}
                >
                  <AddIcon className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
