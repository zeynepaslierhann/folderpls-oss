import type { ReactNode } from "react";
import { AppScope } from "@/components/dashboard/app-scope";

/**
 * /demo panel bileşenlerini (satırlar, etiket çipleri, menüler) yeniden kullanır; panel token'ları
 * `.fp-app` / `html[data-fp-app]` kapsamındadır (components/dashboard/app-scope.tsx). Kapsam yalnız bu
 * rotada açılır, sayfadan çıkınca kaldırılır; pazarlama sitesinin geri kalanı bu değerleri görmez.
 * Drive çağrısı BAŞLATMAZ.
 */
export default function DemoLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AppScope>{children}</AppScope>;
}
