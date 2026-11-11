"use client";

import { useCallback, useSyncExternalStore } from "react";

/** CSS media query eşleşmesi; sunucuda ve ilk render'da `false`. */
export function useMediaQuery(query: string): boolean {
  // subscribe/getSnapshot kimliği yalnız `query` değişince değişir: her render'da
  // yeni fonksiyon geçmek useSyncExternalStore'u her seferinde yeniden abone eder.
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );
  const getSnapshot = useCallback(
    () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false),
    [query]
  );
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function getServerSnapshot() {
  return false;
}
