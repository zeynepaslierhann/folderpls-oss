"use client";

import { useLayoutEffect, type ReactNode } from "react";

/**
 * Klavyeyle gezinme sayılan tuşlar; kısayol harfleri ("i", "k") sayılmaz.
 * Escape dahil: dialog/menü Escape ile kapanınca odak tetikleyiciye döner ve
 * halka görünmeli (WCAG 2.4.7); ayrı bir Tab beklemek gerekmesin.
 */
const NAV_KEYS = new Set([
  "Escape",
  "Tab",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

/**
 * Panel token kapsamı. Sarmalayıcı `.fp-app` ağaç içindeki her şeye panel
 * token'larını verir; Radix portalları (menü, dialog, toast) body'ye render
 * olduğu için aynı kapsam `html[data-fp-app]` ile de açılır ve sayfadan
 * çıkınca kaldırılır. Pazarlama sitesi bu değerleri hiç görmez.
 *
 * Girdi kipi: Tab/ok/Escape tuşları `html[data-fp-kbd]` koyar, fare/dokunma kaldırır.
 * Odak halkası yalnız bu işaret varken çizilir (globals.css) — fareyle
 * seçilen satır ya da dialog'un otomatik odakladığı düğme halka göstermez.
 */
export function AppScope({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-fp-app", "");
    const onKey = (e: KeyboardEvent) => {
      if (NAV_KEYS.has(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) root.setAttribute("data-fp-kbd", "");
    };
    const onPointer = () => root.removeAttribute("data-fp-kbd");
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer, true);
      root.removeAttribute("data-fp-app");
      root.removeAttribute("data-fp-kbd");
    };
  }, []);

  return <div className="fp-app contents">{children}</div>;
}
