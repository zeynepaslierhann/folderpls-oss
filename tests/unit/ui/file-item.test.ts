import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/i18n/i18n-context", () => ({
  useI18n: () => ({ locale: "en", t: (k: string) => k }),
}));

const { withStatusChip } = await import("@/components/dashboard/file-item/use-file-item-model");
const { FileItem } = await import("@/components/dashboard/file-item/file-item-list");
const { FileGridItem } = await import("@/components/dashboard/file-item/file-item-grid");

const noop = () => {};
const base = {
  accessToken: "tok",
  onOpenFolder: noop,
  onPreview: noop,
  onCopy: noop,
  onCut: noop,
  onDelete: noop,
  onRename: noop,
  onAddLabel: noop,
  onDownload: noop,
};
const pdf = { id: "f1", name: "Rapor Q3.pdf", mimeType: "application/pdf", size: "123456", modifiedTime: "2026-09-28T10:00:00.000Z" };
const folder = { id: "d1", name: "Faturalar", mimeType: "application/vnd.google-apps.folder", modifiedTime: "2026-05-05T10:00:00.000Z" };
const labels = [{ id: "l1", name: "Onaylı", color: "#112233" }];

const render = (C: unknown, props: Record<string, unknown>) =>
  renderToStaticMarkup(createElement(C as never, { ...base, ...props } as never));

describe("withStatusChip", () => {
  it("durum yoksa etiketleri olduğu gibi (aynı dizi) döndürür", () => {
    expect(withStatusChip(labels, undefined)).toBe(labels);
  });
  it("durum varsa rozeti ilk çip olarak ekler ve etiketleri korur", () => {
    expect(withStatusChip(labels, { name: "Bitti", color: "#0f0" })).toEqual([
      { id: "__status", name: "Bitti", color: "#0f0" },
      ...labels,
    ]);
  });
});

describe.each([
  ["liste satırı", FileItem, "row"],
  ["ızgara kartı", FileGridItem, "listitem"],
] as const)("%s", (_name, Component, role) => {
  it("dosya ve klasörü doğru rol, kimlik ve adla çizer", () => {
    const f = render(Component, { file: pdf });
    expect(f).toContain(`role="${role}"`);
    expect(f).toContain('data-file-id="f1"');
    expect(f).toContain("Rapor Q3.pdf");
    const d = render(Component, { file: folder });
    expect(d).toContain('data-file-id="d1"');
    expect(d).toContain("Faturalar");
  });

  it("durum rozeti ve etiket çipleri görünür", () => {
    const html = render(Component, { file: pdf, labels, statusOption: { name: "Bitti", color: "#0f0" } });
    expect(html).toContain("Bitti");
    expect(html).toContain("Onaylı");
    expect(html.indexOf("Bitti")).toBeLessThan(html.indexOf("Onaylı"));
  });

  it("seçim kutusu yalnız onSelect verilince çizilir", () => {
    expect(render(Component, { file: pdf })).not.toContain('role="checkbox"');
    expect(render(Component, { file: pdf, onSelect: noop })).toContain('role="checkbox"');
  });

  it("sürüklenebilirlik yalnız hem dragFileIds hem onMoveToFolder varken açılır", () => {
    expect(render(Component, { file: pdf })).not.toContain('draggable="true"');
    expect(render(Component, { file: pdf, dragFileIds: ["f1"] })).not.toContain('draggable="true"');
    expect(render(Component, { file: pdf, onMoveToFolder: noop })).not.toContain('draggable="true"');
    expect(render(Component, { file: pdf, dragFileIds: ["f1"], onMoveToFolder: noop })).toContain('draggable="true"');
  });
});

describe("farklar", () => {
  it("liste klasör boyutunu '—' gösterir; ızgara dosya boyutunu meta satırında verir", () => {
    expect(render(FileItem, { file: folder })).toContain("—");
    expect(render(FileGridItem, { file: pdf })).toMatch(/KB|MB|B/);
  });
});
