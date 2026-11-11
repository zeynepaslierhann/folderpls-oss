"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Watches a list of step blocks and reports which one currently sits in the
 * viewport's center band. Pure IntersectionObserver — no scroll-jacking, no
 * layout reads on every frame.
 */
export function useActiveStep(stepCount: number) {
  const [activeIndex, setActiveIndex] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const nodes = refs.current.filter((n): n is HTMLDivElement => n != null);
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = refs.current.indexOf(entry.target as HTMLDivElement);
          if (idx !== -1) setActiveIndex(idx);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [stepCount]);

  const setStepRef = (index: number) => (el: HTMLDivElement | null) => {
    refs.current[index] = el;
  };

  return { activeIndex, setStepRef };
}
