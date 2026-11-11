import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

interface ProgressProps {
  /** Tamamlanan adet; `total` yoksa belirsiz ilerleme (metin + spinner). */
  value?: number;
  total?: number;
  /** Görünen metin, örn. "380 of 1,240 files". */
  label: string;
  /** Verilirse sağda "Cancel" bağlantısı gösterilir. */
  onCancel?: () => void;
  cancelLabel?: string;
  className?: string;
}

/**
 * Uzun / arka plan işi (spec §4.1): 4px çubuk (--fg dolgu, --line iz),
 * yanında metin ve isteğe bağlı Cancel. Sayfanın geri kalanı kullanılabilir
 * kalır; bu bileşen hiçbir şeyi kilitlemez.
 */
export function Progress({ value, total, label, onCancel, cancelLabel = "Cancel", className }: ProgressProps) {
  const determinate = typeof value === "number" && typeof total === "number" && total > 0;
  const pct = determinate ? Math.min(100, Math.max(0, (value! / total!) * 100)) : 0;
  return (
    <div className={cn("flex min-w-0 items-center gap-3 text-sm text-fg-2", className)}>
      {determinate ? (
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={value}
          className="h-1 w-32 shrink-0 overflow-hidden rounded-full bg-line"
        >
          <div
            className="h-full rounded-full bg-fg transition-[width] duration-[var(--dur-base)] ease-panel"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <Spinner className="text-fg-2" />
      )}
      <span className="min-w-0 truncate tabular-nums" aria-live="polite">
        {label}
      </span>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="ml-auto shrink-0 rounded-md px-2 py-1 text-sm font-medium text-fg hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {cancelLabel}
        </button>
      )}
    </div>
  );
}
