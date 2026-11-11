"use client";

import { useEffect, useRef } from "react";

const DOTS = { spacing: 28, minAlpha: 0.25, maxAlpha: 0.45, radius: 1.2 } as const;
const POINTER = { reach: 180, alphaGain: 0.5, radiusGain: 2.2 } as const;
const POINTER_REACH_SQUARED = POINTER.reach ** 2;
const BUCKET_SIZE = Math.max(50, Math.floor(POINTER.reach / 1.5));

/** Brand ocean + lemon, pre-split so the frame loop never parses colours. */
const COLORS: ReadonlyArray<readonly [number, number, number]> = [
  [155, 179, 208],
  [255, 229, 0],
];

type Dot = {
  readonly x: number;
  readonly y: number;
  rgb: readonly [number, number, number];
  alpha: number;
  alphaGoal: number;
  alphaStep: number;
};

const randomAlpha = () => DOTS.minAlpha + Math.random() * (DOTS.maxAlpha - DOTS.minAlpha);

function twinkle(dot: Dot) {
  dot.alpha += dot.alphaStep;
  if (dot.alpha < dot.alphaGoal && dot.alpha > DOTS.minAlpha) return;
  dot.alphaStep = -dot.alphaStep;
  dot.alphaGoal = randomAlpha();
}

/**
 * Cursor-reactive dot grid (hero ambient layer).
 * Performance: the rAF loop only runs while the hero is on screen, never under
 * prefers-reduced-motion (one static frame instead), and does no per-frame
 * allocation or string parsing.
 */
export function HeroCursorGrid() {
  const surface = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = surface.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dots: Dot[] = [];
    let grid = new Map<string, number[]>();
    let width = 0;
    let height = 0;
    let mouseX: number | null = null;
    let mouseY: number | null = null;
    let frame = 0;
    let visible = true;

    const build = () => {
      const host = canvas.parentElement;
      const w = host?.clientWidth ?? window.innerWidth;
      const h = host?.clientHeight ?? window.innerHeight;
      if (w === width && h === height && dots.length) return;
      width = w;
      height = h;
      canvas.width = width;
      canvas.height = height;
      dots = [];
      grid = new Map();
      const cols = Math.ceil(w / DOTS.spacing);
      const rows = Math.ceil(h / DOTS.spacing);
      for (let col = 0; col < cols; col++) {
        const x = (col + 0.5) * DOTS.spacing;
        for (let row = 0; row < rows; row++) {
          const y = (row + 0.5) * DOTS.spacing;
          const key = `${Math.floor(x / BUCKET_SIZE)}_${Math.floor(y / BUCKET_SIZE)}`;
          const bucket = grid.get(key);
          if (bucket) bucket.push(dots.length);
          else grid.set(key, [dots.length]);
          const alpha = randomAlpha();
          dots.push({
            x,
            y,
            rgb: COLORS[(col * 7 + row * 3) % COLORS.length],
            alpha,
            alphaGoal: alpha,
            alphaStep: 0.002 + Math.random() * 0.004,
          });
        }
      }
    };

    const draw = (animate: boolean) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const active = new Set<number>();
      if (mouseX !== null && mouseY !== null) {
        const cx = Math.floor(mouseX / BUCKET_SIZE);
        const cy = Math.floor(mouseY / BUCKET_SIZE);
        const span = Math.ceil(POINTER.reach / BUCKET_SIZE);
        for (let col = -span; col <= span; col++)
          for (let row = -span; row <= span; row++) grid.get(`${cx + col}_${cy + row}`)?.forEach((idx) => active.add(idx));
      }
      for (let index = 0; index < dots.length; index++) {
        const dot = dots[index];
        if (animate) twinkle(dot);

        let glow = 0;
        if (mouseX !== null && mouseY !== null && active.has(index)) {
          const dx = dot.x - mouseX;
          const dy = dot.y - mouseY;
          const distanceSquared = dx ** 2 + dy ** 2;
          if (distanceSquared < POINTER_REACH_SQUARED) glow = Math.max(0, 1 - Math.sqrt(distanceSquared) / POINTER.reach) ** 2;
        }

        ctx.fillStyle = `rgba(${dot.rgb[0]},${dot.rgb[1]},${dot.rgb[2]},${Math.min(1, dot.alpha + glow * POINTER.alphaGain).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, DOTS.radius + glow * POINTER.radiusGain, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = () => {
      draw(true);
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (reduced || frame || !visible) return;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    build();
    draw(false);

    const onResize = () => {
      build();
      draw(false);
    };
    const onMouseMove = (e: MouseEvent) => {
      const { left, top } = canvas.getBoundingClientRect();
      mouseX = e.clientX - left;
      mouseY = e.clientY - top;
    };
    const onMouseLeave = () => {
      mouseX = null;
      mouseY = null;
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      if (visible) start();
      else stop();
    });
    observer.observe(canvas);

    window.addEventListener("resize", onResize);
    if (!reduced) {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      document.documentElement.addEventListener("mouseleave", onMouseLeave);
    }
    start();

    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return <canvas ref={surface} aria-hidden className="absolute inset-0 w-full h-full pointer-events-none opacity-90 dark:opacity-70" />;
}
