import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createDelayedVisibility,
  lockedWidthStyle,
  DEFAULT_LOADING_DELAY_MS,
  DEFAULT_LOADING_MIN_VISIBLE_MS,
} from "@/lib/ui/delayed-visibility";
import { Skeleton } from "@/components/ui/loading/skeleton";
import { Spinner } from "@/components/ui/loading/spinner";
import { Progress } from "@/components/ui/loading/progress";
import { Button } from "@/components/ui/button";

afterEach(() => {
  vi.useRealTimers();
});

function setup(opts?: { delay?: number; minVisible?: number }) {
  vi.useFakeTimers();
  const changes: boolean[] = [];
  const ctrl = createDelayedVisibility((v) => changes.push(v), opts);
  return { ctrl, changes };
}

describe("delayed visibility (spec §4.1: 150ms gecikme, ≥300ms görünürlük)", () => {
  it("varsayılanlar 150 / 300 ms", () => {
    expect(DEFAULT_LOADING_DELAY_MS).toBe(150);
    expect(DEFAULT_LOADING_MIN_VISIBLE_MS).toBe(300);
  });

  it("150 ms'den kısa yüklemede gösterge hiç görünmez", () => {
    const { ctrl, changes } = setup();
    ctrl.update(true);
    vi.advanceTimersByTime(149);
    ctrl.update(false);
    vi.advanceTimersByTime(1000);
    expect(changes).toEqual([]);
    expect(ctrl.visible).toBe(false);
  });

  it("150 ms dolunca görünür", () => {
    const { ctrl, changes } = setup();
    ctrl.update(true);
    vi.advanceTimersByTime(150);
    expect(changes).toEqual([true]);
    expect(ctrl.visible).toBe(true);
  });

  it("bir kez göründüyse en az 300 ms kalır", () => {
    const { ctrl, changes } = setup();
    ctrl.update(true);
    vi.advanceTimersByTime(150);
    vi.advanceTimersByTime(50); // 50 ms görünür kaldı
    ctrl.update(false);
    vi.advanceTimersByTime(249);
    expect(changes).toEqual([true]);
    vi.advanceTimersByTime(1);
    expect(changes).toEqual([true, false]);
  });

  it("300 ms'yi zaten aştıysa hemen kaybolur", () => {
    const { ctrl, changes } = setup();
    ctrl.update(true);
    vi.advanceTimersByTime(150 + 400);
    ctrl.update(false);
    expect(changes).toEqual([true, false]);
  });

  it("gizlenmeyi beklerken yükleme yeniden başlarsa gösterge kesintisiz kalır", () => {
    const { ctrl, changes } = setup();
    ctrl.update(true);
    vi.advanceTimersByTime(160);
    ctrl.update(false);
    vi.advanceTimersByTime(100);
    ctrl.update(true);
    vi.advanceTimersByTime(1000);
    expect(changes).toEqual([true]);
  });

  it("dispose bekleyen zamanlayıcıyı iptal eder", () => {
    const { ctrl, changes } = setup();
    ctrl.update(true);
    ctrl.dispose();
    vi.advanceTimersByTime(1000);
    expect(changes).toEqual([]);
  });
});

describe("düğme genişliği yükleme sırasında sabit kalır", () => {
  it("yüklenirken ölçülen genişlik min-width olur", () => {
    expect(lockedWidthStyle(true, 96)).toEqual({ minWidth: 96 });
  });
  it("yükleme bitince kilit kalkar", () => {
    expect(lockedWidthStyle(false, 96)).toEqual({});
    expect(lockedWidthStyle(true, null)).toEqual({});
  });

  it("loading prop'u spinner, aria-busy ve disabled verir", () => {
    const html = renderToStaticMarkup(createElement(Button, { loading: true }, "Saving…"));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("disabled");
    expect(html).toContain("data-spinner");
    expect(html).toContain("Saving…");
  });

  it("loading yokken spinner render edilmez", () => {
    const html = renderToStaticMarkup(createElement(Button, null, "Save"));
    expect(html).not.toContain("data-spinner");
    expect(html).not.toMatch(/\saria-busy=/);
  });

  it("devre dışı primary ağır blok olmaz: nötr %10 zemin, --fg-3 metin", () => {
    const html = renderToStaticMarkup(createElement(Button, { variant: "primary", disabled: true }, "Create"));
    expect(html).toContain("[&amp;:disabled:not([aria-busy])]:bg-fg/10");
    expect(html).toContain("[&amp;:disabled:not([aria-busy])]:text-fg-3");
  });

  // Pazarlama sitesinin eski hover kaldırması yalnız html:not([data-fp-app]) ile
  // kapsanır; panelde (html[data-fp-app]) o sınıflar hiç eşleşmez.
  const panelClasses = (html: string) =>
    (html.match(/class="([^"]*)"/)?.[1] ?? "")
      .split(" ")
      .filter((c) => !c.includes("html:not([data-fp-app])"))
      .join(" ");

  it("düğmede hover ölçeği ya da gölgesi yok (panel)", () => {
    for (const variant of ["primary", "default", "secondary", "outline", "ghost", "danger", "destructive"] as const) {
      const html = renderToStaticMarkup(createElement(Button, { variant }, "New"));
      expect(panelClasses(html), variant).not.toMatch(/scale|shadow/);
    }
  });

  it("pazarlama hover kaldırması yalnız panel dışına kapsanır", () => {
    const html = renderToStaticMarkup(createElement(Button, { variant: "default" }, "Go"));
    expect(html).toContain("[html:not([data-fp-app])_&amp;]:hover:scale-[1.02]");
    expect(html).toContain("[html:not([data-fp-app])_&amp;]:hover:shadow-lg");
  });

  it("asChild: disabled/loading düğme olmayan öğeye aria ile geçer", () => {
    const link = (props: Record<string, unknown>) =>
      renderToStaticMarkup(createElement(Button, { asChild: true, ...props }, createElement("a", { href: "/x" }, "Go")));
    const off = link({ disabled: true });
    expect(off).toContain('aria-disabled="true"');
    expect(off).toContain("pointer-events-none");
    const busy = link({ loading: true });
    expect(busy).toContain('aria-busy="true"');
    expect(busy).toContain('aria-disabled="true"');
    const idle = link({});
    expect(idle).not.toMatch(/\saria-disabled=/);
    expect(idle).not.toMatch(/\saria-busy=/);
  });

  it("lg boyutu pazarlama ölçüsünü korur", () => {
    const html = renderToStaticMarkup(createElement(Button, { size: "lg" }, "Go"));
    expect(html).toContain("h-11 px-8");
  });
});

describe("iskelet durağan, spinner reduced-motion'a uyar", () => {
  const motionCss = fs.readFileSync(path.resolve(__dirname, "../../../app/motion.css"), "utf8");

  it("Skeleton animasyon sınıfı taşımaz (nabız/shimmer yok)", () => {
    const html = renderToStaticMarkup(createElement(Skeleton, { className: "h-4" }));
    expect(html).not.toMatch(/animate-|skeleton|shimmer|pulse/);
    expect(html).toContain('aria-hidden="true"');
  });

  it("Spinner dönmeyi .motion-spin'den alır", () => {
    const html = renderToStaticMarkup(createElement(Spinner, { label: "Loading" }));
    expect(html).toContain("motion-spin");
    expect(html).toContain('role="status"');
  });

  it(".motion-spin yalnız prefers-reduced-motion: no-preference içinde döner", () => {
    const rule = motionCss.match(/@media \(prefers-reduced-motion: no-preference\) \{\s*\.motion-spin \{[^}]*animation:[^}]*\}/);
    expect(rule).not.toBeNull();
    const outside = motionCss.replace(rule![0], "");
    expect(outside).not.toMatch(/\.motion-spin\s*\{[^}]*animation:/);
  });

  it("Progress belirli ilerlemede progressbar rolü ve değer taşır", () => {
    const html = renderToStaticMarkup(createElement(Progress, { value: 380, total: 1240, label: "380 of 1,240 files" }));
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="380"');
    expect(html).toContain("380 of 1,240 files");
  });
});
