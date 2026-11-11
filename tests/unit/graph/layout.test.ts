import { describe, expect, it } from "vitest";
import { computeLayout } from "@/lib/graph/layout";

describe("computeLayout", () => {
  it("returns an empty map for no nodes", () => {
    expect(computeLayout([], []).size).toBe(0);
  });

  it("places a single node at the origin", () => {
    const positions = computeLayout([{ id: "only" }], []);
    expect(positions.get("only")).toEqual({ x: 0, y: 0 });
  });

  it("keeps the designated center fixed at the origin", () => {
    const nodes = [{ id: "center" }, { id: "a" }, { id: "b" }, { id: "c" }];
    const edges = [
      { source: "center", target: "a" },
      { source: "center", target: "b" },
      { source: "center", target: "c" },
    ];
    const positions = computeLayout(nodes, edges, { centerId: "center", iterations: 40 });
    expect(positions.get("center")).toEqual({ x: 0, y: 0 });
  });

  it("is deterministic: identical inputs produce identical positions", () => {
    const nodes = [{ id: "center" }, { id: "a" }, { id: "b" }];
    const edges = [{ source: "center", target: "a" }, { source: "a", target: "b" }];
    const run1 = computeLayout(nodes, edges, { centerId: "center", iterations: 50 });
    const run2 = computeLayout(nodes, edges, { centerId: "center", iterations: 50 });
    expect([...run1]).toEqual([...run2]);
  });

  it("produces finite, non-overlapping-ish positions (no NaN/Infinity)", () => {
    const nodes = Array.from({ length: 30 }, (_, i) => ({ id: `n${i}` }));
    const edges = nodes.slice(1).map((n, i) => ({ source: nodes[i].id, target: n.id }));
    const positions = computeLayout(nodes, edges, { centerId: "n0" });
    for (const [, p] of positions) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });
});
