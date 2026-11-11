"use client";

import { useState, useCallback } from "react";
import { getLabelStore } from "@/lib/storage";
import type { NoteBlock, FileRelation } from "@/lib/types";
import { useNotes } from "./use-notes";
import { PanelHeader } from "./panel-header";
import { PanelTabs } from "./panel-tabs";
import { PanelFooter } from "./panel-footer";
import { PropertiesTab } from "./properties-tab";
import { NotesTab } from "./notes-tab";
import { RelationsTab } from "./relations-tab";
import type { FileDetailsPanelProps, TabType } from "./types";

export function FileDetailsPanel({
  file,
  onClose,
  userLabels,
  itemLabels,
  propertyDefinitions,
  itemProperties,
  itemNotes,
  itemRelations,
  availableFiles,
  onUpdate,
}: FileDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("properties");
  const labelStore = getLabelStore();

  // Notes management
  const saveNotes = useCallback(
    async (newNotes: NoteBlock[]) => {
      await labelStore.updateItemContent(file.id, { notes: newNotes });
      onUpdate();
    },
    [labelStore, file.id, onUpdate]
  );

  const {
    localNotes,
    addNoteBlock,
    updateBlockContent,
    deleteBlock,
    toggleTodo,
    flushNotesSave,
  } = useNotes({
    itemNotes,
    onSave: saveNotes,
    activeTab,
  });

  // Property handlers
  const handlePropertyChange = async (
    propertyId: string,
    value: string | number | boolean | string[]
  ) => {
    await labelStore.updateItemProperty(file.id, propertyId, value);
    onUpdate();
  };

  // Label handlers
  const handleAddLabel = async (labelId: string) => {
    await labelStore.addLabelToItem(file.id, labelId);
    onUpdate();
  };

  const handleRemoveLabel = async (labelId: string) => {
    await labelStore.removeLabelFromItem(file.id, labelId);
    onUpdate();
  };

  // Relation handlers
  const saveRelations = async (relations: FileRelation[]) => {
    await labelStore.updateItemContent(file.id, { relations });
    onUpdate();
  };

  const handleAddRelation = (relation: Omit<FileRelation, "createdAt">) =>
    saveRelations([...itemRelations, { ...relation, createdAt: new Date() }]);

  const handleRemoveRelation = (targetFileId: string) =>
    saveRelations(itemRelations.filter((existing) => existing.targetFileId !== targetFileId));

  return (
    <div className="flex h-full w-full flex-col bg-raised">
      <PanelHeader file={file} onClose={onClose} />

      <PanelTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {activeTab === "properties" && (
          <PropertiesTab
            itemLabels={itemLabels}
            userLabels={userLabels}
            propertyDefinitions={propertyDefinitions}
            itemProperties={itemProperties}
            onAddLabel={handleAddLabel}
            onRemoveLabel={handleRemoveLabel}
            onPropertyChange={handlePropertyChange}
          />
        )}

        {activeTab === "notes" && (
          <NotesTab
            notes={localNotes}
            onAddBlock={addNoteBlock}
            onUpdateContent={updateBlockContent}
            onDeleteBlock={deleteBlock}
            onToggleTodo={toggleTodo}
            onBlur={flushNotesSave}
          />
        )}

        {activeTab === "relations" && (
          <RelationsTab
            fileId={file.id}
            itemRelations={itemRelations}
            availableFiles={availableFiles}
            onAddRelation={handleAddRelation}
            onRemoveRelation={handleRemoveRelation}
          />
        )}
      </div>

      <PanelFooter file={file} />
    </div>
  );
}
