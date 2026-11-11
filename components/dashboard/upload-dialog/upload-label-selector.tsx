"use client";

import { LabelBadge } from "@/components/shared/label-selector/label-badge";
import { LabelColorPicker } from "@/components/shared/label-selector/label-color-picker";
import { LABEL_SEARCH_MIN } from "@/components/shared/label-selector/label-selector";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/i18n-context";
import { PRESET_COLORS, getRandomPresetColor } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddIcon, SearchIcon } from "@/components/icons";
import type { LabelItem } from "@/lib/types/label";

interface UploadLabelSelectorProps {
  existingLabels: LabelItem[];
  selectedLabelIds: string[];
  newLabelsToCreate: Omit<LabelItem, "id">[];
  onToggleLabel: (labelId: string) => void;
  onAddNewLabel: (label: Omit<LabelItem, "id">) => void;
  onRemoveNewLabel: (index: number) => void;
}

export function UploadLabelSelector({
  existingLabels,
  selectedLabelIds,
  newLabelsToCreate,
  onToggleLabel,
  onAddNewLabel,
  onRemoveNewLabel,
}: UploadLabelSelectorProps) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingNewLabel, setIsCreatingNewLabel] = useState(false);
  const [newLabelDraft, setNewLabelDraft] = useState<Omit<LabelItem, "id">>({ name: "", color: PRESET_COLORS[0] });
  const { name: newLabelName, color: newLabelColor } = newLabelDraft;

  const needle = searchQuery.toLowerCase();
  const filteredLabels = existingLabels.filter(({ name }) => name.toLowerCase().includes(needle));

  const handleAddNewLabel = () => {
    if (!newLabelName.trim()) return;
    onAddNewLabel({ name: newLabelName.trim(), color: newLabelColor });
    setNewLabelDraft({ name: "", color: getRandomPresetColor() });
    setIsCreatingNewLabel(false);
  };

  const cancelNewLabel = () => {
    setIsCreatingNewLabel(false);
    setNewLabelDraft((draft) => ({ ...draft, name: "" }));
  };

  return (
    <div>
      <Label className="mb-2 block text-sm font-medium">{t("dialogs.upload.labelAllOptional")}</Label>
      <div className="space-y-2">
        {/* Arama yalnız çok etiket varken (LABEL_SEARCH_MIN). */}
        {existingLabels.length > LABEL_SEARCH_MIN && (
          <div className="relative">
            <SearchIcon className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3" aria-hidden="true" />
            <Input
              placeholder={t("dialogs.upload.searchLabels")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        )}

        {/* Mevcut + bu yüklemede oluşturulacak etiketler tek satır akışında;
            "New label" akışın sonunda (ayrı bir satır açmaz). */}
        <div className="flex flex-wrap items-center gap-1">
          {filteredLabels.map((label) => (
            <LabelBadge
              key={label.id}
              size="sm"
              label={label}
              selected={selectedLabelIds.includes(label.id)}
              showCheck={selectedLabelIds.includes(label.id)}
              onClick={() => onToggleLabel(label.id)}
            />
          ))}
          {newLabelsToCreate.map((label, i) => (
            <LabelBadge key={i} size="sm" label={label} selected onRemove={() => onRemoveNewLabel(i)} />
          ))}
          {!isCreatingNewLabel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreatingNewLabel(true)}
              className="h-6 gap-1 px-2 text-xs text-fg-2"
            >
              <AddIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {t("dialogs.bulkLabel.newLabel")}
            </Button>
          )}
        </div>

        {/* Create New Label Form */}
        {isCreatingNewLabel ? (
          <div className="space-y-2 rounded-md border border-line p-2">
            <Input
              autoFocus
              className="h-8"
              placeholder={t("dialogs.bulkLabel.labelName")}
              value={newLabelName}
              onChange={(event) => {
                const { value } = event.target;
                setNewLabelDraft((draft) => ({ ...draft, name: value }));
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAddNewLabel()}
            />
            <LabelColorPicker
              selectedColor={newLabelColor}
              onColorSelect={(color) => setNewLabelDraft((draft) => ({ ...draft, color }))}
            />
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                onClick={handleAddNewLabel}
                disabled={!newLabelName.trim()}
              >
                <AddIcon className="mr-1 h-4 w-4" aria-hidden="true" />
                {t("dialogs.bulkLabel.add")}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={cancelNewLabel}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
