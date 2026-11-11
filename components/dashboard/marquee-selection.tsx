"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const FILE_NODE_SELECTOR = "[data-file-id]";
/** Pointer travel (px) on either axis before a press counts as a drag. */
const DRAG_START_DISTANCE = 4;
/** Boxes smaller than this on both axes select nothing. */
const MIN_BOX_SIZE = 2;

type Box = Pick<DOMRectReadOnly, "left" | "top" | "width" | "height">;

interface DragSession {
  originX: number;
  originY: number;
  /** Stays null until the pointer has moved past DRAG_START_DISTANCE. */
  box: Box | null;
}

function touchesBox(element: DOMRect, box: Box) {
  const overlapsX = element.left <= box.left + box.width && box.left <= element.right;
  const overlapsY = element.top <= box.top + box.height && box.top <= element.bottom;
  return overlapsX && overlapsY;
}

function collectFileIds(container: HTMLElement, box: Box) {
  return Array.from(container.querySelectorAll(FILE_NODE_SELECTOR)).flatMap((node) => {
    const fileId = node.getAttribute("data-file-id");
    return fileId && touchesBox(node.getBoundingClientRect(), box) ? [fileId] : [];
  });
}

export function MarqueeSelection({
  children,
  onMarqueeSelect,
  className,
  enabled = true,
}: {
  children: React.ReactNode;
  onMarqueeSelect: (ids: string[], additive: boolean) => void;
  className?: string;
  enabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<DragSession | null>(null);
  const swallowNextClickRef = useRef(false);
  const [visibleBox, setVisibleBox] = useState<Box | null>(null);

  // A drag can leave the container, so tracking happens on the window.
  useEffect(() => {
    const trackPointer = (event: MouseEvent) => {
      const session = sessionRef.current;
      if (!session) return;

      const width = Math.abs(event.clientX - session.originX);
      const height = Math.abs(event.clientY - session.originY);
      if (!session.box && Math.max(width, height) < DRAG_START_DISTANCE) return;

      swallowNextClickRef.current = true;
      session.box = {
        left: Math.min(session.originX, event.clientX),
        top: Math.min(session.originY, event.clientY),
        width,
        height,
      };
      setVisibleBox(session.box);
    };

    const releasePointer = (event: MouseEvent) => {
      if (event.button !== 0 || !sessionRef.current) return;

      const { box } = sessionRef.current;
      const container = containerRef.current;
      sessionRef.current = null;
      setVisibleBox(null);

      if (!box || !container) return;
      if (Math.max(box.width, box.height) < MIN_BOX_SIZE) return;
      onMarqueeSelect(collectFileIds(container, box), event.shiftKey);
    };

    const listeners = new AbortController();
    window.addEventListener("mousemove", trackPointer, { signal: listeners.signal });
    window.addEventListener("mouseup", releasePointer, { signal: listeners.signal });
    return () => listeners.abort();
  }, [onMarqueeSelect]);

  const beginSession = (event: React.MouseEvent) => {
    const pressedFile = (event.target as HTMLElement).closest(FILE_NODE_SELECTOR);
    if (!enabled || event.button !== 0 || pressedFile) return;
    sessionRef.current = { originX: event.clientX, originY: event.clientY, box: null };
    swallowNextClickRef.current = false;
  };

  const swallowClickAfterDrag = (event: React.MouseEvent) => {
    if (!swallowNextClickRef.current) return;
    swallowNextClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const showBox = visibleBox !== null && visibleBox.width > 0 && visibleBox.height > 0;

  return (
    <div
      ref={containerRef}
      className={cn("select-none", className)}
      onMouseDown={beginSession}
      onClickCapture={swallowClickAfterDrag}
    >
      {children}
      {showBox && (
        <div
          className="pointer-events-none fixed z-50 rounded-sm border border-control bg-accent-soft/40"
          style={visibleBox}
        />
      )}
    </div>
  );
}
