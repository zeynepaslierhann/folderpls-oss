"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { resolvePendingViewTransition } from "@/lib/motion/view-transition";

const OBSERVED = "data-motion-observed";

function supportsScrollTimelines(): boolean {
  return typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("animation-timeline: view()");
}

/**
 * The only piece of JS the motion system needs (app/motion.css does the rest):
 *  1. finishes pending View Transitions once the new route commits,
 *  2. pauses ambient loops ([data-ambient]) while they are off-screen,
 *  3. feeds the pointer position to `.motion-spotlight` cards,
 *  4. IntersectionObserver fallback for `.reveal` where CSS scroll-driven
 *     animations are unsupported (e.g. Firefox today).
 * Renders nothing.
 */
export function MotionRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    resolvePendingViewTransition();
  }, [pathname]);

  useEffect(() => {
    // The dashboard doesn't use reveal/ambient/spotlight and mutates the DOM
    // constantly; keep the observers away from it.
    if (pathname?.startsWith("/dashboard")) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fallback = !reduced && !supportsScrollTimelines();
    const root = document.documentElement;

    const ambientObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) entry.target.toggleAttribute("data-offscreen", !entry.isIntersecting);
      },
      { rootMargin: "120px 0px" },
    );

    const revealObserver = fallback
      ? new IntersectionObserver(
          (entries, observer) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              entry.target.classList.add("is-revealed");
              observer.unobserve(entry.target);
            }
          },
          { rootMargin: "0px 0px -8% 0px" },
        )
      : null;

    const scan = () => {
      const viewportH = window.innerHeight;
      document.querySelectorAll<HTMLElement>(`[data-ambient]:not([${OBSERVED}])`).forEach((el) => {
        el.setAttribute(OBSERVED, "");
        ambientObserver.observe(el);
      });
      if (!revealObserver) return;
      document.querySelectorAll<HTMLElement>(`.reveal:not([${OBSERVED}])`).forEach((el) => {
        el.setAttribute(OBSERVED, "");
        // Already on screen when the fallback kicks in: show it right away so
        // adding html.motion-fallback never makes visible content blink.
        const rect = el.getBoundingClientRect();
        if (rect.top < viewportH && rect.bottom > 0) el.classList.add("is-revealed");
        else revealObserver.observe(el);
      });
    };

    scan();
    if (fallback) root.classList.add("motion-fallback");

    let frame = 0;
    const mutationObserver = new MutationObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        scan();
      });
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    // Spotlight: one delegated listener, rAF-throttled, fine pointers only.
    let spotFrame = 0;
    let lastEvent: PointerEvent | null = null;
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      lastEvent = event;
      if (spotFrame) return;
      spotFrame = requestAnimationFrame(() => {
        spotFrame = 0;
        const e = lastEvent;
        if (!e || !(e.target instanceof Element)) return;
        const card = e.target.closest<HTMLElement>(".motion-spotlight");
        if (!card) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        card.style.setProperty("--my", `${e.clientY - rect.top}px`);
      });
    };
    if (!reduced) document.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      mutationObserver.disconnect();
      ambientObserver.disconnect();
      revealObserver?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      if (spotFrame) cancelAnimationFrame(spotFrame);
      document.removeEventListener("pointermove", onPointerMove);
      document.querySelectorAll(`[${OBSERVED}]`).forEach((el) => el.removeAttribute(OBSERVED));
    };
  }, [pathname]);

  return null;
}
