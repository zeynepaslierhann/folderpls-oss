import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  /** Ekran okuyucu metni; verilmezse spinner süs sayılır (aria-hidden). */
  label?: string;
}

/**
 * Tek spinner (spec §4.1): 14px, 1.5px halka, currentColor. Yalnız düğme
 * içinde ya da satır içi kısa eylemlerde kullanılır — sayfa ortasında asla.
 * Dönme `.motion-spin` ile gelir; reduced-motion'da halka durağan kalır.
 */
export function Spinner({ className, label }: SpinnerProps) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-hidden={label ? undefined : true}
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      data-spinner=""
    >
      <span className="motion-spin block size-3.5 rounded-full border-[1.5px] border-current border-r-transparent" />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
