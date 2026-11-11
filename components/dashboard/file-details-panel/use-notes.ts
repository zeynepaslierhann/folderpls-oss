"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import type { NoteBlock } from "@/lib/types";

const NOTES_SAVE_DELAY_MS = 600;

interface UseNotesParams {
  itemNotes: NoteBlock[];
  onSave: (notes: NoteBlock[]) => Promise<void>;
  activeTab: string;
}

export function useNotes({ itemNotes, onSave, activeTab }: UseNotesParams) {
  // Use a key-based reset pattern
  const [notesState, setNotesState] = useState<{
    source: NoteBlock[];
    local: NoteBlock[];
  }>({
    source: itemNotes || [],
    local: itemNotes || [],
  });

  // Reset local state when source prop changes
  const localNotes = useMemo(
    () =>
      itemNotes === notesState.source ? notesState.local : itemNotes || [],
    [itemNotes, notesState.source, notesState.local]
  );

  const setLocalNotes = useCallback(
    (newNotes: NoteBlock[]) => {
      setNotesState({ source: itemNotes || [], local: newNotes });
    },
    [itemNotes]
  );

  const pendingNotesSaveRef = useRef<{
    notes: NoteBlock[];
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const persistNotes = useCallback(
    async (newNotes: NoteBlock[]) => {
      await onSave(newNotes);
    },
    [onSave]
  );

  /** Bekleyen gecikmeli kaydı iptal eder ve (varsa) kaydedilmemiş notları verir. */
  const takePendingNotes = useCallback(() => {
    const pending = pendingNotesSaveRef.current;
    if (!pending) return null;
    clearTimeout(pending.timer);
    pendingNotesSaveRef.current = null;
    return pending.notes;
  }, []);

  const handleUpdateNotes = useCallback(
    async (newNotes: NoteBlock[], immediate = false) => {
      setLocalNotes(newNotes);
      takePendingNotes();

      if (!immediate) {
        const timer = setTimeout(() => {
          pendingNotesSaveRef.current = null;
          persistNotes(newNotes);
        }, NOTES_SAVE_DELAY_MS);
        pendingNotesSaveRef.current = { notes: newNotes, timer };
        return;
      }

      await persistNotes(newNotes);
    },
    [setLocalNotes, takePendingNotes, persistNotes]
  );

  const flushNotesSave = useCallback(() => {
    const unsaved = takePendingNotes();
    if (unsaved) persistNotes(unsaved);
  }, [takePendingNotes, persistNotes]);

  // Flush on tab change
  const leftNotesTab = activeTab !== "notes";
  useEffect(() => {
    if (leftNotesTab) flushNotesSave();
  }, [leftNotesTab, flushNotesSave]);

  // Note operations
  const addNoteBlock = useCallback(
    (type: NoteBlock["type"]) => {
      const newBlock: NoteBlock = {
        id: `block_${Date.now()}`,
        type,
        content: "",
        createdAt: new Date(),
      };
      handleUpdateNotes(localNotes.concat(newBlock), true);
    },
    [localNotes, handleUpdateNotes]
  );

  const updateBlockContent = useCallback(
    (id: string, content: string) => {
      const updated = localNotes.map((b) => (b.id === id ? { ...b, content } : b));
      handleUpdateNotes(updated);
    },
    [localNotes, handleUpdateNotes]
  );

  const deleteBlock = useCallback(
    (id: string) => {
      const updated = localNotes.filter((b) => b.id !== id);
      handleUpdateNotes(updated, true);
    },
    [localNotes, handleUpdateNotes]
  );

  const toggleTodo = useCallback(
    (id: string) => {
      const updated = localNotes.map((b) =>
        b.id === id ? { ...b, checked: !b.checked } : b
      );
      handleUpdateNotes(updated, true);
    },
    [localNotes, handleUpdateNotes]
  );

  return {
    localNotes,
    addNoteBlock,
    updateBlockContent,
    deleteBlock,
    toggleTodo,
    flushNotesSave,
  };
}
