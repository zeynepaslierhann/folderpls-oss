"use client";

import type { CSSProperties } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PRESET_COLORS } from "@/lib/constants";
import { tagDotStyle, toTagTone } from "@/lib/tag-tone";
import { useI18n } from "@/lib/i18n/i18n-context";

interface LabelColorMenuProps {
  color: string;
  onChange: (color: string) => void;
  labelName: string;
}

/**
 * Etiket başına 8 nokta yerine tek renk noktası (spec §3 Labels); tıklanınca
 * 8 tonluk menü açılır. Seçili ton menüde radyo işaretiyle de gösterilir.
 */
export function LabelColorMenu({ color, onChange, labelName }: LabelColorMenuProps) {
  const { t } = useI18n();
  const current = toTagTone(color).name;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-8 w-7 shrink-0 items-center justify-center rounded-md hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-hover"
        aria-label={`${t("dashboard.panel.labelColor")}: ${labelName}`}
      >
        <span className="tag-dot size-3 rounded-full" style={tagDotStyle(color) as CSSProperties} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(name) => {
            const next = PRESET_COLORS.find((c) => toTagTone(c).name === name);
            if (next) onChange(next);
          }}
        >
          {PRESET_COLORS.map((c) => {
            const tone = toTagTone(c).name;
            return (
              <DropdownMenuRadioItem key={c} value={tone}>
                <span className="tag-dot mr-2 size-2.5 rounded-full" style={tagDotStyle(c) as CSSProperties} />
                {t(`dashboard.panel.tone_${tone}`)}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
