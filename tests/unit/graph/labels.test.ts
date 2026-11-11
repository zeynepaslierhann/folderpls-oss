import { describe, expect, it } from "vitest";
import { truncateLabel, DEFAULT_TRUNCATE_LEN, placeLabels } from "@/lib/graph";

describe("truncateLabel — dense radial layout label de-collision", () => {
  it("leaves short names untouched", () => {
    expect(truncateLabel("logo.png")).toBe("logo.png");
  });

  it("truncates names longer than the default length with an ellipsis", () => {
    const result = truncateLabel("Görsel-004.png");
    expect(result.length).toBeLessThanOrEqual(DEFAULT_TRUNCATE_LEN);
    expect(result.endsWith("…")).toBe(true);
  });

  it("two similarly-prefixed sibling file names truncate to the SAME shortened string (proves the default view needs hover/select for disambiguation, not that truncation alone fixes collision — see graph-canvas.tsx showFullName)", () => {
    const a = truncateLabel("Görsel-004.png");
    const b = truncateLabel("Görsel-009.png");
    // Both are meaningfully shorter than the originals — this is what stops
    // them physically overlapping at typical sibling spacing.
    expect(a.length).toBeLessThan("Görsel-004.png".length);
    expect(b.length).toBeLessThan("Görsel-009.png".length);
  });

  it("respects a custom max length", () => {
    expect(truncateLabel("abcdefgh", 4)).toBe("abc…");
  });

  it("is a no-op at max=name.length", () => {
    expect(truncateLabel("abcd", 4)).toBe("abcd");
  });
});

describe("placeLabels — etiket çakışması (390 px Graph)", () => {
  const item = (id: string, x: number, y: number, text: string, priority = 4) => ({ id, x, y, r: 5, text, priority });

  it("uzak düğümlerin etiketi hep altta kalır", () => {
    const sides = placeLabels([item("a", 0, 0, "Budget"), item("b", 200, 0, "Roadmap")], 12);
    expect(sides.get("a")).toBe("below");
    expect(sides.get("b")).toBe("below");
  });

  it("yan yana iki düğümde ikincinin etiketi üste geçer (üst üste binmez)", () => {
    // Brand Guide… / Roadmap Q4: 56 px arayla.
    const sides = placeLabels([item("brand", 98, 557, "Brand Guide…"), item("road", 154, 561, "Roadmap Q4")], 12);
    expect(sides.get("brand")).toBe("below");
    expect(sides.get("road")).toBe("above");
  });

  it("iki konum da doluysa düşük öncelikli etiket çizilmez, yüksek öncelikli kalır", () => {
    const sides = placeLabels(
      [item("low", 6, 0, "Contract Dr…", 4), item("a", 0, 0, "Invoices 20…", 0), item("b", 12, 0, "Design Asse…", 2)],
      12
    );
    expect(sides.get("a")).toBe("below");
    expect(sides.get("b")).toBe("above");
    expect(sides.get("low")).toBeNull();
  });

  it("odaktaki (öncelik 0) etiket, aynı yerdeki başka etiketten önce yer alır", () => {
    const sides = placeLabels([item("file", 0, 0, "README.md", 4), item("center", 0, 0, "Drive", 0)], 12);
    expect(sides.get("center")).toBe("below");
    expect(sides.get("file")).toBe("above");
  });
});
