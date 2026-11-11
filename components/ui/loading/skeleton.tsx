import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Tek iskelet görünümü (spec §4.1): --hover renginde, DURAĞAN blok —
 * nabız ya da shimmer yok. İçeriğin gerçek şeklini taşıyacak biçimde
 * boyutlandırılır; görünürlüğü useDelayedVisible ile geciktirilir.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("rounded-sm bg-hover", className)} {...props} />;
}
