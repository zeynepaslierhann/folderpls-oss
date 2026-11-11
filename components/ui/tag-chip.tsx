import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { tagDotStyle } from "@/lib/tag-tone";

/**
 * Etiket rengi noktası (8px). Renk yalnız burada taşınır; açık/koyu ton
 * `.tag-dot` sınıfı ile seçilir (globals.css).
 */
export function TagDot({ color, className }: { color: string | null | undefined; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("tag-dot inline-block size-2 shrink-0 rounded-full", className)}
      style={tagDotStyle(color) as CSSProperties}
    />
  );
}

interface TagChipProps {
  name: string;
  color: string | null | undefined;
  className?: string;
  /** Sondaki ek (örn. kaldır düğmesi). */
  trailing?: ReactNode;
  title?: string;
}

/**
 * Etiket çipi (spec §3): 20px, --r-sm, 1px --line, zemin yok, 6px yatay
 * padding, 8px nokta + 4px boşluk, metin text-xs 500 --fg-2. Animasyon yok.
 */
export function TagChip({ name, color, className, trailing, title }: TagChipProps) {
  return (
    <span
      title={title ?? name}
      className={cn(
        "inline-flex h-5 max-w-40 shrink-0 items-center gap-1 rounded-sm border border-line px-1.5 text-xs font-medium text-fg-2",
        className
      )}
    >
      <TagDot color={color} />
      <span className="truncate">{name}</span>
      {trailing}
    </span>
  );
}

interface TagChipListProps {
  labels: { id: string; name: string; color: string }[];
  /** En fazla bu kadar çip; geri kalanı `+N` çipine toplanır (tooltip'te tam liste). */
  max?: number;
  className?: string;
}

export function TagChipList({ labels, max = 3, className }: TagChipListProps) {
  if (labels.length === 0) return null;
  const visible = labels.slice(0, max);
  const rest = labels.slice(max);
  return (
    <span className={cn("flex min-w-0 items-center gap-1", className)}>
      {visible.map((l) => (
        <TagChip key={l.id} name={l.name} color={l.color} />
      ))}
      {rest.length > 0 && (
        <span
          title={rest.map((l) => l.name).join(", ")}
          className="inline-flex h-5 shrink-0 items-center rounded-sm border border-line px-1.5 text-xs font-medium text-fg-2 tabular-nums"
        >
          +{rest.length}
        </span>
      )}
    </span>
  );
}
