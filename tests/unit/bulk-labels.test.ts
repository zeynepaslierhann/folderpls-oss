import { describe, expect, it, vi } from "vitest";
import { applyLabelsToFiles, mergeLabelIds, nextItemMetadata } from "@/lib/hooks/use-drive-operations/bulk-labels";

const files = [
  { id: "a", name: "A" },
  { id: "b", name: "B" },
  { id: "c", name: "C" },
];

describe("bulk label apply", () => {
  it("merge is idempotent and keeps existing labels", () => {
    const once = mergeLabelIds(["x"], ["y", "x"]);
    expect(once).toEqual(["x", "y"]);
    expect(mergeLabelIds(once, ["y", "x"])).toEqual(once);
    expect(mergeLabelIds(undefined, ["z"])).toEqual(["z"]);
  });

  it("reports partial failure without losing successes", async () => {
    const save = vi.fn(async (f: { id: string }) => {
      if (f.id === "b") throw new Error("boom");
    });
    const r = await applyLabelsToFiles(["a", "b", "c"], files, { a: ["x"] }, ["l1"], save);
    expect(r.failedIds).toEqual(["b"]);
    expect(r.succeeded.map((s) => s.file.id)).toEqual(["a", "c"]);
    expect(r.succeeded[0].merged).toEqual(["x", "l1"]);
  });

  it("counts ids missing from the displayed list as failed, dedupes ids", async () => {
    const save = vi.fn(async () => {});
    const r = await applyLabelsToFiles(["a", "a", "zzz"], files, {}, ["l1"], save);
    expect(save).toHaveBeenCalledTimes(1);
    expect(r.failedIds).toEqual(["zzz"]);
  });

  it("retry of only the failed ids succeeds and leaves earlier ones untouched", async () => {
    let fail = true;
    const save = async (f: { id: string }) => {
      if (f.id === "b" && fail) throw new Error("x");
    };
    const first = await applyLabelsToFiles(["a", "b"], files, {}, ["l1"], save);
    fail = false;
    const second = await applyLabelsToFiles(first.failedIds, files, {}, ["l1"], save);
    expect(second.failedIds).toEqual([]);
    expect(second.succeeded.map((s) => s.file.id)).toEqual(["b"]);
  });

  it("builds metadata for an untagged file", () => {
    const m = nextItemMetadata(undefined, files[0], "file", ["l1"]);
    expect(m.itemId).toBe("a");
    expect(m.labels).toEqual(["l1"]);
  });
});
