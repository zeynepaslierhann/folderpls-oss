"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/i18n-context";

import { SearchIcon, AddIcon } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LabelBadge } from "./label-badge";
import { LabelColorPicker } from "./label-color-picker";
import type { LabelItem } from "@/lib/types";

/**
 * Etiket arama kutusu yalnız bundan fazla etiket varken görünür: 8 etiketlik
 * bir listede arama alanı yalnız gürültüdür (tüm etiket seçicilerde ortak).
 */
export const LABEL_SEARCH_MIN = 12;

interface LabelSelectorProps {
  existingLabels: LabelItem[];
  selectedLabelIds: string[];
  newLabelsToCreate: Omit<LabelItem, "id">[];
  searchQuery: string;
  isCreatingNew: boolean;
  newLabelName: string;
  newLabelColor: string;
  onToggleLabel: (labelId: string) => void;
  onRemoveNewLabel: (index: number) => void;
  onSearchChange: (query: string) => void;
  onNewLabelNameChange: (name: string) => void;
  onNewLabelColorChange: (color: string) => void;
  onAddNewLabel: () => void;
  onSetCreatingNew: (creating: boolean) => void;
  /** Verilmezse etiket sayısına göre (LABEL_SEARCH_MIN). */
  showSearch?: boolean;
  showSelectedSection?: boolean;
  /** "Existing labels" ara başlığı; çağıran zaten bir bölüm başlığı koyuyorsa kapatılır. */
  showExistingHeading?: boolean;
  labels?: {
    selectedLabels?: string;
    existingLabels?: string;
    newLabels?: string;
    searchPlaceholder?: string;
    noResults?: string;
    allSelected?: string;
    labelName?: string;
    labelNamePlaceholder?: string;
    color?: string;
    add?: string;
    cancel?: string;
    createNew?: string;
  };
}

function BadgeGroup({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div>
      <Label className="mb-2 block text-xs font-medium text-fg-3">{heading}</Label>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function LabelSelector({
  existingLabels,
  selectedLabelIds,
  newLabelsToCreate,
  searchQuery,
  isCreatingNew,
  newLabelName,
  newLabelColor,
  onToggleLabel,
  onRemoveNewLabel,
  onSearchChange,
  onNewLabelNameChange,
  onNewLabelColorChange,
  onAddNewLabel,
  onSetCreatingNew,
  showSearch: showSearchProp,
  showSelectedSection = true,
  showExistingHeading = true,
  labels = {},
}: LabelSelectorProps) {
  const { t } = useI18n();
  // Defaults follow the UI language (they used to be hard-coded Turkish).
  const {
    selectedLabels: selectedLabelsLabel = t("labelSelector.selected"),
    existingLabels: existingLabelsLabel = t("labelSelector.existing"),
    newLabels: newLabelsLabel = t("labelSelector.newLabels"),
    searchPlaceholder = t("labelSelector.search"),
    noResults = t("labelSelector.noResults"),
    allSelected = t("labelSelector.allSelected"),
    labelName = t("labelSelector.labelName"),
    labelNamePlaceholder = t("labelSelector.labelNamePlaceholder"),
    color = t("labelSelector.color"),
    add = t("labelSelector.add"),
    cancel = t("common.cancel"),
    createNew = t("labelSelector.createNew"),
  } = labels;

  const showSearch = showSearchProp ?? existingLabels.length > LABEL_SEARCH_MIN;

  const isSelected = (label: LabelItem) => selectedLabelIds.includes(label.id);

  // Ayrı "Selected" bölümü yoksa çipler yerinde açılıp kapanır (seçili çip
  // onay işaretiyle listede kalır). Eskiden seçilen etiket listeden düşüyor
  // ve hiçbir yerde görünmüyordu (Create folder, Bulk label).
  const inlineToggle = !showSelectedSection;
  const needle = searchQuery.toLowerCase();
  const filteredAvailableLabels = existingLabels.filter(
    (label) => label.name.toLowerCase().includes(needle) && (inlineToggle || !isSelected(label))
  );
  const hasExistingLabels = existingLabels.length > 0;

  const selectedBadges = showSelectedSection
    ? existingLabels.filter(isSelected).map((label) => (
        <LabelBadge key={label.id} label={label} selected showCheck onRemove={() => onToggleLabel(label.id)} />
      ))
    : [];
  const pendingBadges = newLabelsToCreate.map((label, index) => (
    <LabelBadge key={index} label={label} selected onRemove={() => onRemoveNewLabel(index)} />
  ));

  return (
    <div className="space-y-4">
      {/* Selected Labels */}
      {selectedBadges.length > 0 && <BadgeGroup heading={selectedLabelsLabel}>{selectedBadges}</BadgeGroup>}

      {hasExistingLabels && (
        <div>
          {showExistingHeading && (
            <Label className="mb-2 block text-xs font-medium text-fg-3">{existingLabelsLabel}</Label>
          )}
          {showSearch && (
            <div className="relative mb-2">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3" aria-hidden="true" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          {filteredAvailableLabels.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {filteredAvailableLabels.map((label) => {
                const on = inlineToggle && selectedLabelIds.includes(label.id);
                return (
                  <LabelBadge
                    key={label.id}
                    label={label}
                    selected={on}
                    showCheck={on}
                    onClick={() => onToggleLabel(label.id)}
                  />
                );
              })}
            </div>
          ) : (
            <p className="py-2 text-sm text-fg-2">
              {searchQuery ? noResults : allSelected}
            </p>
          )}
        </div>
      )}

      {pendingBadges.length > 0 && <BadgeGroup heading={newLabelsLabel}>{pendingBadges}</BadgeGroup>}

      {/* Create New Label */}
      {isCreatingNew ? (
        <div className="space-y-3 rounded-md border border-line p-3">
          <div>
            <Label htmlFor="label-name" className="text-sm">{labelName}</Label>
            <Input
              id="label-name"
              value={newLabelName}
              onChange={(e) => onNewLabelNameChange(e.target.value)}
              placeholder={labelNamePlaceholder}
              className="mt-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") onAddNewLabel();
              }}
            />
          </div>
          <div>
            <Label className="text-sm">{color}</Label>
            <LabelColorPicker
              selectedColor={newLabelColor}
              onColorSelect={onNewLabelColorChange}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={onAddNewLabel}
              disabled={!newLabelName.trim()}
              className="gap-1"
            >
              <AddIcon className="h-4 w-4" aria-hidden="true" />
              {add}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSetCreatingNew(false)}
            >
              {cancel}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSetCreatingNew(true)}
          className="gap-1.5"
        >
          <AddIcon className="h-4 w-4" aria-hidden="true" />
          {createNew}
        </Button>
      )}
    </div>
  );
}
