import { describe, it, expect, vi } from "vitest";
import { labelSelectorProps } from "@/components/shared/label-selector/selector-props";

describe("labelSelectorProps", () => {
  it("useLabelSelection durumunu LabelSelector özelliklerine birebir eşler", () => {
    const fns = {
      toggleLabel: vi.fn(),
      removeNewLabel: vi.fn(),
      setSearchQuery: vi.fn(),
      setNewLabelName: vi.fn(),
      setNewLabelColor: vi.fn(),
      addNewLabel: vi.fn(),
      setIsCreatingNew: vi.fn(),
    };
    const selection = {
      selectedLabelIds: ["a"],
      newLabelsToCreate: [{ name: "Yeni", color: "#112233" }],
      newLabelName: "Y",
      newLabelColor: "#445566",
      isCreatingNew: true,
      searchQuery: "ra",
      setSelectedLabelIds: vi.fn(),
      reset: vi.fn(),
      ...fns,
    };
    const props = labelSelectorProps(selection);

    expect(props).toEqual({
      selectedLabelIds: ["a"],
      newLabelsToCreate: [{ name: "Yeni", color: "#112233" }],
      searchQuery: "ra",
      isCreatingNew: true,
      newLabelName: "Y",
      newLabelColor: "#445566",
      onToggleLabel: fns.toggleLabel,
      onRemoveNewLabel: fns.removeNewLabel,
      onSearchChange: fns.setSearchQuery,
      onNewLabelNameChange: fns.setNewLabelName,
      onNewLabelColorChange: fns.setNewLabelColor,
      onAddNewLabel: fns.addNewLabel,
      onSetCreatingNew: fns.setIsCreatingNew,
    });
  });

  it("yalnız seçiciye ait alanları taşır (reset / setSelectedLabelIds sızmaz)", () => {
    const noop = vi.fn();
    const props = labelSelectorProps({
      selectedLabelIds: [],
      newLabelsToCreate: [],
      newLabelName: "",
      newLabelColor: "#000000",
      isCreatingNew: false,
      searchQuery: "",
      setSelectedLabelIds: noop,
      setNewLabelName: noop,
      setNewLabelColor: noop,
      setIsCreatingNew: noop,
      setSearchQuery: noop,
      toggleLabel: noop,
      addNewLabel: noop,
      removeNewLabel: noop,
      reset: noop,
    });
    expect(Object.keys(props)).toHaveLength(13);
    expect(props).not.toHaveProperty("reset");
    expect(props).not.toHaveProperty("setSelectedLabelIds");
  });
});
