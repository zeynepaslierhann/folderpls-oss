"use client";

import { CheckIcon, CloseIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/i18n-context";
import { TagDot } from "@/components/ui/tag-chip";

interface LabelBadgeProps {
  label: {
    id?: string;
    name: string;
    color: string;
  };
  selected?: boolean;
  showCheck?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Seçilebilir etiket çipi (TagChip'in etkileşimli hali). Seçim yalnız renkle
 * anlatılmaz: seçili çipte --accent-soft zemin + onay işareti. Pop/ölçek
 * animasyonu yok.
 */
export function LabelBadge({
  label,
  selected = false,
  showCheck = false,
  onRemove,
  onClick,
  size = "md",
  className,
}: LabelBadgeProps) {
  const { t } = useI18n();
  const sizeClasses = {
    sm: "h-6 px-2 text-xs",
    md: "h-7 px-2.5 text-sm",
  };

  const content = (
    <>
      {showCheck ? <CheckIcon className="h-3 w-3" aria-hidden="true" /> : <TagDot color={label.color} />}
      <span className="truncate">{label.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`${t("common.delete")}: ${label.name}`}
          className="-mr-1 ml-0.5 rounded-sm p-0.5 text-fg-3 hover:bg-hover hover:text-fg"
        >
          <CloseIcon className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
    </>
  );

  const baseClasses = cn(
    "inline-flex max-w-48 items-center gap-1.5 rounded-md border font-medium transition-colors duration-[var(--dur-fast)] ease-panel",
    sizeClasses[size],
    selected ? "border-control bg-accent-soft text-fg" : "border-line bg-raised text-fg-2 hover:bg-hover hover:text-fg",
    onClick && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    className
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClasses} aria-pressed={selected}>
        {content}
      </button>
    );
  }

  return <span className={baseClasses}>{content}</span>;
}
