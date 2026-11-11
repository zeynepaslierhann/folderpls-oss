"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Görüntüleyiciye özel küçük tercih (örn. detay paneli açık mı). localStorage
 * gizli pencerede ya da engellendiğinde atabilir — her erişim try/catch'te,
 * okunamazsa varsayılan değer kullanılır.
 */
export function useStoredBoolean(key: string, initial: boolean): [boolean, (next: boolean | ((prev: boolean) => boolean)) => void] {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- tek seferlik, mount sonrası okuma (SSR ile uyumlu)
      if (raw === "1" || raw === "0") setValue(raw === "1");
    } catch {
      /* depolama yok: varsayılan */
    }
  }, [key]);

  const set = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setValue((prev) => {
        const v = typeof next === "function" ? next(prev) : next;
        try {
          window.localStorage.setItem(key, v ? "1" : "0");
        } catch {
          /* yok say */
        }
        return v;
      });
    },
    [key]
  );

  return [value, set];
}
