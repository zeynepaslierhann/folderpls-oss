import { useRef, useState, type DragEvent } from "react";
import { logger } from "@/lib/logger";
import { getFilesFromDrop, type DropFileEntry } from "@/lib/utils/drop-utils";

interface FileDropZoneOptions {
  connected: boolean;
  targetFolderId: string | null;
  onFilesDropped: (entries: DropFileEntry[]) => void;
}

const carriesFiles = (event: DragEvent) => event.dataTransfer.types.includes("Files");
const crossesZoneEdge = (event: DragEvent) => !event.currentTarget.contains(event.relatedTarget as Node);

/** Tracks an OS file drag over one element and hands the dropped entries to the caller. */
export function useFileDropZone({ connected, targetFolderId, onFilesDropped }: FileDropZoneOptions) {
  const [isDragOver, setIsDragOver] = useState(false);
  const enteredZones = useRef(0);

  const endDrag = () => {
    enteredZones.current = 0;
    setIsDragOver(false);
  };

  const dropZoneProps = {
    onDragEnter(event: DragEvent) {
      if (!carriesFiles(event)) return;
      if (crossesZoneEdge(event)) enteredZones.current++;
      if (connected) setIsDragOver(true);
    },
    onDragOver(event: DragEvent) {
      event.preventDefault();
      event.stopPropagation();
      if (carriesFiles(event)) event.dataTransfer.dropEffect = "copy";
    },
    onDragLeave(event: DragEvent) {
      if (!crossesZoneEdge(event)) return;
      enteredZones.current--;
      if (enteredZones.current <= 0) endDrag();
    },
    async onDrop(event: DragEvent) {
      event.preventDefault();
      event.stopPropagation();
      endDrag();
      if (!connected || !targetFolderId) return;
      try {
        const entries = await getFilesFromDrop(event.dataTransfer);
        if (entries.length > 0) onFilesDropped(entries);
      } catch (err) {
        logger.error("Drop files:", err);
      }
    },
  };

  return { isDragOver, dropZoneProps };
}
