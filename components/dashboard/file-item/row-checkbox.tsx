import { CheckIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

interface RowCheckboxProps {
  checked: boolean;
  label: string;
  onToggle: (e: React.MouseEvent) => void;
  /** Herhangi bir seçim varken ya da dokunmatik ekranda hep görünür. */
  forceVisible?: boolean;
  className?: string;
}

/**
 * 16px seçim kutusu (spec §3): hover, odak ya da herhangi bir seçim varken
 * görünür. Seçim yalnız renkle anlatılmaz: dolu kutu + onay işareti.
 * Tıklama hedefi 24×24 (görsel kutu 16px, çevresi şeffaf dolgu).
 */
export function RowCheckbox({ checked, label, onToggle, forceVisible, className }: RowCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      onDoubleClick={(e) => e.stopPropagation()}
      className={cn(
        "group/box flex size-6 shrink-0 items-center justify-center rounded-sm transition-opacity duration-[var(--dur-fast)] focus-visible:opacity-100 focus-visible:outline-none",
        checked || forceVisible ? "opacity-100" : "opacity-0 group-hover/item:opacity-100 group-focus-within/item:opacity-100 pointer-coarse:opacity-100",
        className
      )}
    >
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded-sm border group-focus-visible/box:ring-2 group-focus-visible/box:ring-ring group-focus-visible/box:ring-offset-1",
          checked ? "border-fg bg-fg text-canvas" : "border-control bg-raised"
        )}
      >
        {checked && <CheckIcon className="h-3 w-3" aria-hidden="true" />}
      </span>
    </button>
  );
}
