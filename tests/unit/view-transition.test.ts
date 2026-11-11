import { describe, it, expect } from "vitest";
import { shouldAnimateNavigation, type NavigationClick } from "@/lib/motion/view-transition";

const plain: NavigationClick = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
const here = { origin: "https://app.example.com", pathname: "/" };

describe("shouldAnimateNavigation", () => {
  it("animates a plain left click to another in-app page", () => {
    expect(shouldAnimateNavigation(plain, "/pricing", here)).toBe(true);
    expect(shouldAnimateNavigation(plain, "https://app.example.com/blog", here)).toBe(true);
  });

  it("keeps native behaviour for modifier / middle clicks and handled events", () => {
    expect(shouldAnimateNavigation({ ...plain, metaKey: true }, "/pricing", here)).toBe(false);
    expect(shouldAnimateNavigation({ ...plain, ctrlKey: true }, "/pricing", here)).toBe(false);
    expect(shouldAnimateNavigation({ ...plain, shiftKey: true }, "/pricing", here)).toBe(false);
    expect(shouldAnimateNavigation({ ...plain, button: 1 }, "/pricing", here)).toBe(false);
    expect(shouldAnimateNavigation({ ...plain, defaultPrevented: true }, "/pricing", here)).toBe(false);
  });

  it("ignores new tabs, downloads, external links and same-page hash jumps", () => {
    expect(shouldAnimateNavigation(plain, "/pricing", here, "_blank")).toBe(false);
    expect(shouldAnimateNavigation(plain, "/pricing", here, null, true)).toBe(false);
    expect(shouldAnimateNavigation(plain, "https://support.google.com/drive", here)).toBe(false);
    expect(shouldAnimateNavigation(plain, "/#faq", here)).toBe(false);
    expect(shouldAnimateNavigation(plain, "/#faq", { ...here, pathname: "/pricing" })).toBe(true);
  });
});
