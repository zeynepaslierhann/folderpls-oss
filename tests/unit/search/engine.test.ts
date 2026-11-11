import { describe, expect, it } from "vitest";
import { createSearchEngine } from "@/lib/search/engine";
import { emptySearchQuery } from "@/lib/search/types";
import { buildSampleDataset } from "./fixtures";

function q(text: string, chips: import("@/lib/search/types").SearchChip[] = []) {
  return { text, chips };
}

describe("createSearchEngine — matching", () => {
  const data = buildSampleDataset();
  const engine = createSearchEngine(data);

  it("finds files by exact/prefix name match", () => {
    const results = engine.search(q("Fatura"));
    expect(results.map((r) => r.file.id)).toContain("f2");
  });

  it("is Turkish-normalization aware (ASCII typing finds accented names)", () => {
    const results = engine.search(q("sirket"));
    expect(results[0]?.file.id).toBe("f1");
  });

  it("tolerates a typo via fuzzy matching", () => {
    const results = engine.search(q("Sozlesme")); // missing cedilla + typo-ish ASCII form
    expect(results.map((r) => r.file.id)).toContain("f3");
  });

  it("matches label names", () => {
    const results = engine.search(q("Fatura"));
    const match = results.find((r) => r.file.id === "f2");
    expect(match?.matches.some((m) => m.field === "label")).toBe(true);
  });

  it("matches property values, resolving select/status ids to display names", () => {
    const results = engine.search(q("Onaylandı"));
    const ids = results.map((r) => r.file.id);
    expect(ids).toContain("f2"); // prop_status = opt_approved -> "Onaylandı"
  });

  it("matches note text (lowest-weight field)", () => {
    const results = engine.search(q("onaylandı bilgisi"));
    // f4 only matches via note text; f2 matches via property. Both should be found.
    const ids = results.map((r) => r.file.id);
    expect(ids).toContain("f4");
  });

  it("requires all terms to match (AND across terms)", () => {
    const results = engine.search(q("Fatura Ocak"));
    expect(results.map((r) => r.file.id)).toEqual(["f2"]);
    const noMatch = engine.search(q("Fatura Şubat"));
    expect(noMatch).toHaveLength(0);
  });

  it("returns everything, alphabetically, for an empty query", () => {
    const results = engine.search(emptySearchQuery());
    expect(results.length).toBe(data.files.length);
    const names = results.map((r) => r.file.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, "tr"));
    expect(names).toEqual(sorted);
  });
});

describe("createSearchEngine — ranking (name > label > property > note)", () => {
  it("ranks a name match above a property-only match for the same term", () => {
    const data = buildSampleDataset();
    // Rename f1 to contain the literal term "onay" so it wins on name; f2 only wins via property "Onaylandı".
    data.files[0] = { ...data.files[0], name: "Onay Süreci.pdf" };
    const engine = createSearchEngine(data);
    const results = engine.search(q("Onay"));
    const rank = results.map((r) => r.file.id);
    expect(rank[0]).toBe("f1");
  });
});

describe("createSearchEngine — structural filter chips", () => {
  const data = buildSampleDataset();
  const engine = createSearchEngine(data);

  it("filters by label chip", () => {
    const results = engine.search(q("", [{ id: "c1", kind: "label", labelId: "lbl_fatura", displayLabel: "" }]));
    expect(results.map((r) => r.file.id)).toEqual(["f2"]);
  });

  it("filters by type chip (folder)", () => {
    const results = engine.search(q("", [{ id: "c1", kind: "type", fileType: "folder", displayLabel: "" }]));
    expect(results.map((r) => r.file.id)).toEqual(["d1"]);
  });

  it("filters by type chip (extension)", () => {
    const results = engine.search(q("", [{ id: "c1", kind: "type", fileType: "pdf", displayLabel: "" }]));
    expect(results.map((r) => r.file.id).sort()).toEqual(["f1", "f2"]);
  });

  it("combines free text and chips (AND)", () => {
    const results = engine.search(
      q("Taslağı", [{ id: "c1", kind: "label", labelId: "lbl_sozlesme", displayLabel: "" }])
    );
    expect(results.map((r) => r.file.id)).toEqual(["f3"]);
  });

  it("filters by property=value chip", () => {
    const results = engine.search(
      q("", [{ id: "c1", kind: "property", propertyId: "prop_status", propertyValue: "Taslak", displayLabel: "" }])
    );
    expect(results.map((r) => r.file.id)).toEqual(["f3"]);
  });
});

describe("createSearchEngine — highlighting", () => {
  it("produces character ranges into the original (accented) file name", () => {
    const data = buildSampleDataset();
    const engine = createSearchEngine(data);
    const results = engine.search(q("Rapor"));
    const match = results[0]?.matches.find((m) => m.field === "name");
    expect(match?.ranges?.length).toBeGreaterThan(0);
    const [start, end] = match!.ranges![0];
    expect(results[0].file.name.slice(start, end).toLowerCase()).toBe("rapor");
  });
});

describe("createSearchEngine — suggestions", () => {
  it("suggests label and property names by prefix", () => {
    const data = buildSampleDataset();
    const engine = createSearchEngine(data);
    expect(engine.suggestLabelNames("Fat")).toContain("Fatura");
    expect(engine.suggestPropertyNames("Dur")).toContain("Durum");
  });
});
