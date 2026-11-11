"use client";

import type { CSSProperties } from "react";
import { CheckIcon } from "@/components/icons";
import { PRESET_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { tagDotStyle, toTagTone } from "@/lib/tag-tone";

interface LabelColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  className?: string;
}

/** Sekiz sönük ton; seçili ton onay işaretiyle de belirtilir (yalnız renk değil). */
export function LabelColorPicker({
  selectedColor,
  onColorSelect,
  className,
}: LabelColorPickerProps) {
  const selectedTone = toTagTone(selectedColor).name;
  return (
    <div className={cn("flex flex-wrap gap-1", className)} role="radiogroup" aria-label="Label color">
      {PRESET_COLORS.map((color) => {
        const tone = toTagTone(color).name;
        const active = tone === selectedTone;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onColorSelect(color)}
            className={cn(
              "flex size-7 items-center justify-center rounded-md transition-colors duration-[var(--dur-fast)] hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active && "bg-hover"
            )}
            aria-label={tone}
          >
            <span className="tag-dot flex size-4 items-center justify-center rounded-full text-white" style={tagDotStyle(color) as CSSProperties}>
              {active && <CheckIcon className="h-3 w-3" aria-hidden="true" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
