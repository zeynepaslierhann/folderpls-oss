import type { useLabelSelection } from "./use-label-selection";

type LabelSelection = ReturnType<typeof useLabelSelection>;

/**
 * `useLabelSelection` durumunu `LabelSelector` özelliklerine eşler. Üç diyalog
 * (etiket ekle, toplu etiket, klasör oluştur) aynı 13 satırlık eşlemeyi elle
 * yazıyordu. `existingLabels` ve görsel seçenekler çağıranda kalır.
 */
export function labelSelectorProps(selection: LabelSelection) {
  return {
    selectedLabelIds: selection.selectedLabelIds,
    newLabelsToCreate: selection.newLabelsToCreate,
    searchQuery: selection.searchQuery,
    isCreatingNew: selection.isCreatingNew,
    newLabelName: selection.newLabelName,
    newLabelColor: selection.newLabelColor,
    onToggleLabel: selection.toggleLabel,
    onRemoveNewLabel: selection.removeNewLabel,
    onSearchChange: selection.setSearchQuery,
    onNewLabelNameChange: selection.setNewLabelName,
    onNewLabelColorChange: selection.setNewLabelColor,
    onAddNewLabel: selection.addNewLabel,
    onSetCreatingNew: selection.setIsCreatingNew,
  };
}
