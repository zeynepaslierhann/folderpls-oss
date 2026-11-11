import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  MOTION_DISTANCE_PX,
  MOTION_DURATION_MS,
  MOTION_EASE,
  MOTION_STAGGER_MS,
  easeOutCubic,
  segment,
  smoothstep,
} from "@/lib/motion/tokens";

const css = fs.readFileSync(path.resolve(__dirname, "../../app/motion.css"), "utf8");
// Only the default (motion-allowed) :root block, not the reduced-motion override.
const rootBlock = css.slice(css.indexOf(":root {"), css.indexOf("@media (prefers-reduced-motion: reduce)"));

function cssToken(name: string): string {
  const match = rootBlock.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`token --${name} missing from app/motion.css`);
  return match[1].trim();
}

describe("motion tokens: lib/motion/tokens.ts mirrors app/motion.css", () => {
  it.each(Object.entries(MOTION_DURATION_MS))("duration %s", (key, ms) => {
    expect(cssToken(`motion-duration-${key}`)).toBe(`${ms}ms`);
  });

  it.each(Object.entries(MOTION_DISTANCE_PX))("distance %s", (key, px) => {
    expect(cssToken(`motion-distance-${key}`)).toBe(`${px}px`);
  });

  it.each(Object.entries(MOTION_EASE))("easing %s", (key, points) => {
    const cssName = key === "inOut" ? "in-out" : key;
    expect(cssToken(`motion-ease-${cssName}`)).toBe(`cubic-bezier(${points.join(", ")})`);
  });

  it("stagger", () => {
    expect(cssToken("motion-stagger")).toBe(`${MOTION_STAGGER_MS}ms`);
  });
});

describe("motion system guard rails (app/motion.css)", () => {
  it("collapses every duration and distance under prefers-reduced-motion", () => {
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    for (const key of Object.keys(MOTION_DURATION_MS)) expect(reduced).toMatch(new RegExp(`--motion-duration-${key}:\\s*1ms`));
    for (const key of Object.keys(MOTION_DISTANCE_PX)) expect(reduced).toMatch(new RegExp(`--motion-distance-${key}:\\s*0px`));
  });

  it("keyframes only animate transform / opacity / filter (or the scroll-progress custom property)", () => {
    const allowed = new Set(["transform", "opacity", "filter", "--morph-p"]);
    const keyframes = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g)];
    expect(keyframes.length).toBeGreaterThan(10);
    for (const [, name, body] of keyframes) {
      const props = [...body.matchAll(/^\s*([\w-]+)\s*:/gm)].map((m) => m[1]);
      for (const prop of props) expect(allowed.has(prop), `${name} animates ${prop}`).toBe(true);
    }
  });
});

describe("easing helpers", () => {
  it("clamp to 0..1 and hit the endpoints", () => {
    for (const fn of [smoothstep, easeOutCubic]) {
      expect(fn(-1)).toBe(0);
      expect(fn(0)).toBe(0);
      expect(fn(1)).toBe(1);
      expect(fn(2)).toBe(1);
    }
    expect(smoothstep(0.5)).toBeCloseTo(0.5);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875);
  });

  it("segment maps a parent progress onto a sub-range", () => {
    expect(segment(0.1, 0.2, 0.4)).toBe(0);
    expect(segment(0.4, 0.2, 0.4)).toBeCloseTo(0.5);
    expect(segment(0.9, 0.2, 0.4)).toBe(1);
    expect(segment(0.5, 0.5, 0)).toBe(1);
  });
});
