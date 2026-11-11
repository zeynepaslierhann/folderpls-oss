"use client";

import { useEffect, useRef, useState } from "react";
import { createDelayedVisibility, type DelayedVisibilityOptions } from "@/lib/ui/delayed-visibility";

/**
 * `loading` true olduktan `delay` ms sonra true döner; bir kez göründüyse
 * en az `minVisible` ms true kalır. Varsayılan 150 / 300 ms (spec §4.1).
 */
export function useDelayedVisible(loading: boolean, options: DelayedVisibilityOptions = {}): boolean {
  const [visible, setVisible] = useState(false);
  const { delay, minVisible } = options;
  const ctrl = useRef<ReturnType<typeof createDelayedVisibility> | null>(null);

  useEffect(() => {
    const c = createDelayedVisibility(setVisible, { delay, minVisible });
    ctrl.current = c;
    return () => c.dispose();
  }, [delay, minVisible]);

  useEffect(() => {
    ctrl.current?.update(loading);
  }, [loading, delay, minVisible]);

  return visible;
}
