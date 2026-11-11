import { describe, it, expect, vi } from "vitest";
import {
  MAX_NOTES,
  MAX_NOTE_CONTENT_LENGTH,
  MAX_RELATIONS,
  MAX_RELATION_NOTE_LENGTH,
  isLimitError,
  isValidItemId,
  normalizeNotes,
  normalizeRelations,
  storedLimits,
} from "@/lib/tagged-items/validation";

describe("isValidItemId", () => {
  it("accepts Drive-style ids", () => {
    expect(isValidItemId("1AbC_def-GHI")).toBe(true);
    expect(isValidItemId("a".repeat(128))).toBe(true);
  });
  it("rejects path-like, empty, long and non-string ids", () => {
    for (const v of ["", "a/b", "a/b/c", "../x", "a b", "a.b", "a".repeat(129), 5, null, undefined]) {
      expect(isValidItemId(v)).toBe(false);
    }
  });
});

describe("normalizeNotes", () => {
  const note = { id: "block_1", type: "todo", content: "yap", checked: true, createdAt: "2026-10-01T10:00:00.000Z" };

  it("normalizes a well-formed note and keeps `checked`", () => {
    const r = normalizeNotes([note]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value[0]).toMatchObject({ id: "block_1", type: "todo", content: "yap", checked: true });
      expect(r.value[0].createdAt).toEqual(new Date("2026-10-01T10:00:00.000Z"));
    }
  });

  it("defaults a missing type to text and a missing content to empty", () => {
    const r = normalizeNotes([{ id: "b" }]);
    expect(r.ok && r.value[0]).toMatchObject({ type: "text", content: "" });
  });

  it("never emits `undefined` fields (Firestore rejects them)", () => {
    const r = normalizeNotes([{ id: "b", type: "text", content: "x" }]);
    expect(r.ok && Object.values(r.value[0]).every((v) => v !== undefined)).toBe(true);
    expect(r.ok && "checked" in r.value[0]).toBe(false);
  });

  it("replaces an invalid createdAt with now instead of throwing downstream", () => {
    const r = normalizeNotes([{ id: "b", createdAt: "garbage" }]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(Number.isNaN((r.value[0].createdAt as Date).getTime())).toBe(false);
  });

  // Eski kayıtlarda bulunabilecek biçimler hata değil onarım alır; yoksa öğenin
  // notları kilitlenirdi.
  it("repairs an unknown note type to text and keeps the content", () => {
    const r = normalizeNotes([{ id: "b", type: "script", content: "metin" }]);
    expect(r).toMatchObject({ ok: true, repaired: 1 });
    expect(r.ok && r.value[0]).toMatchObject({ id: "b", type: "text", content: "metin" });
  });

  it("repairs missing / empty / over-long / non-string ids with a unique legacy id, content kept", () => {
    const r = normalizeNotes([
      { id: "block_1", content: "a" },
      { content: "b" },
      { id: "", content: "c" },
      { id: "x".repeat(129), content: "d" },
      { id: 7, content: "e" },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.repaired).toBe(4);
    expect(r.value.map((n) => n.id)).toEqual(["block_1", "legacy_1", "legacy_2", "legacy_3", "legacy_4"]);
    expect(r.value.map((n) => n.content)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("legacy ids never collide with existing ids and are stable for the same input", () => {
    const input = [{ id: "" }, { id: "legacy_0" }, { id: "legacy_0_2" }];
    // Onarılan notun createdAt'ı Date.now(); iki çağrı farklı milisaniyeye düşerse toEqual dalgalı kırılıyordu.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T00:00:00.000Z"));
    const r1 = normalizeNotes(input);
    const r2 = normalizeNotes(input);
    vi.useRealTimers();
    expect(r1.ok && r1.value.map((n) => n.id)).toEqual(["legacy_0_3", "legacy_0", "legacy_0_2"]);
    expect(r2).toEqual(r1);
    const ids = r1.ok ? r1.value.map((n) => n.id) : [];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("a clean list reports repaired: 0", () => {
    expect(normalizeNotes([note])).toMatchObject({ ok: true, repaired: 0 });
  });

  it("still rejects non-object items and non-string content (abuse, never a legitimate stored shape)", () => {
    expect(normalizeNotes([{ id: "b", content: { a: 1 } }])).toEqual({ ok: false, error: "invalid_note" });
    expect(normalizeNotes([{ id: "b", content: 5 }])).toEqual({ ok: false, error: "invalid_note" });
    expect(normalizeNotes(["str"])).toEqual({ ok: false, error: "invalid_note" });
    expect(normalizeNotes([null])).toEqual({ ok: false, error: "invalid_note" });
    expect(normalizeNotes([[1]])).toEqual({ ok: false, error: "invalid_note" });
  });

  it("rejects over-long content and too many notes", () => {
    expect(normalizeNotes([{ id: "b", content: "x".repeat(MAX_NOTE_CONTENT_LENGTH + 1) }])).toEqual({
      ok: false,
      error: "note_too_long",
    });
    const many = Array.from({ length: MAX_NOTES + 1 }, (_, i) => ({ id: `b${i}` }));
    expect(normalizeNotes(many)).toEqual({ ok: false, error: "too_many_notes" });
    expect(normalizeNotes(many.slice(0, MAX_NOTES)).ok).toBe(true);
  });

  it("accepts an empty list (clears all notes)", () => {
    expect(normalizeNotes([])).toEqual({ ok: true, value: [], repaired: 0 });
  });
});

describe("normalizeRelations", () => {
  it("normalizes a well-formed relation", () => {
    const r = normalizeRelations([
      { targetFileId: "1AbC", relationType: "dependency", note: "bkz.", createdAt: "2026-10-01T10:00:00.000Z" },
    ]);
    expect(r.ok && r.value[0]).toMatchObject({ targetFileId: "1AbC", relationType: "dependency", note: "bkz." });
  });

  it("omits an empty relationType / note instead of storing blanks", () => {
    const r = normalizeRelations([{ targetFileId: "1AbC", relationType: "", note: "" }]);
    expect(r.ok && "relationType" in r.value[0]).toBe(false);
    expect(r.ok && "note" in r.value[0]).toBe(false);
  });

  it("drops an unknown relationType but keeps the relation (repaired)", () => {
    for (const relationType of ["friend", 5, { a: 1 }]) {
      const r = normalizeRelations([{ targetFileId: "1AbC", relationType, note: "n" }]);
      expect(r).toMatchObject({ ok: true, repaired: 1 });
      expect(r.ok && r.value[0]).toMatchObject({ targetFileId: "1AbC", note: "n" });
      expect(r.ok && "relationType" in r.value[0]).toBe(false);
    }
  });

  it("drops relations whose targetFileId is not a Drive id, keeps the valid ones", () => {
    const r = normalizeRelations([
      { targetFileId: undefined },
      { targetFileId: "" },
      { targetFileId: "a/b" },
      { targetFileId: "x y" },
      { targetFileId: 7 },
      { targetFileId: "1AbC", relationType: "version" },
    ]);
    expect(r).toMatchObject({ ok: true, repaired: 5 });
    expect(r.ok && r.value).toHaveLength(1);
    expect(r.ok && r.value[0]).toMatchObject({ targetFileId: "1AbC", relationType: "version" });
  });

  it("still rejects non-object relations and a non-string note", () => {
    expect(normalizeRelations([null])).toEqual({ ok: false, error: "invalid_relation" });
    expect(normalizeRelations([{ targetFileId: "1AbC", note: { a: 1 } }])).toEqual({
      ok: false,
      error: "invalid_relation",
    });
  });

  it("rejects an over-long note and too many relations", () => {
    expect(
      normalizeRelations([{ targetFileId: "1AbC", note: "x".repeat(MAX_RELATION_NOTE_LENGTH + 1) }])
    ).toEqual({ ok: false, error: "relation_note_too_long" });
    const many = Array.from({ length: MAX_RELATIONS + 1 }, (_, i) => ({ targetFileId: `f${i}` }));
    expect(normalizeRelations(many)).toEqual({ ok: false, error: "too_many_relations" });
  });
});

// Eski kayıtlar uzunluk/adet sınırı olmadan saklanmış olabilir; sınırı aşan
// saklı kayıt, onarım politikasının önlemeye çalıştığı kilitlenmeyi yaşatırdı.
// Saklı en büyük değeri aşmayan eski veri kabul edilir, daha da büyütülemez.
describe("storedLimits / isLimitError", () => {
  it("counts items and finds the longest text; tolerates garbage", () => {
    expect(storedLimits([{ content: "abc" }, { content: "abcdefg" }, { content: 5 }, null, "x"], "content")).toEqual({
      count: 5,
      longest: 7,
    });
    expect(storedLimits([{ note: "nn" }], "note")).toEqual({ count: 1, longest: 2 });
    for (const v of [undefined, null, "str", { a: 1 }, 7]) {
      expect(storedLimits(v, "content")).toEqual({ count: 0, longest: 0 });
    }
  });

  it("flags only the four limit errors", () => {
    for (const e of ["too_many_notes", "too_many_relations", "note_too_long", "relation_note_too_long"]) {
      expect(isLimitError(e)).toBe(true);
    }
    for (const e of ["invalid_note", "invalid_relation", "other"]) expect(isLimitError(e)).toBe(false);
  });
});

describe("eski sınır aşan saklı veri (grandfathering)", () => {
  const long = (n: number) => "x".repeat(n);

  it("over-long note content is accepted only up to the longest stored text, counted as repaired", () => {
    const stored = storedLimits([{ id: "a", content: long(MAX_NOTE_CONTENT_LENGTH + 100) }], "content");
    // aynı uzunluk: kabul
    expect(normalizeNotes([{ id: "a", content: long(MAX_NOTE_CONTENT_LENGTH + 100) }], stored)).toMatchObject({
      ok: true,
      repaired: 1,
    });
    // saklıdan kısa ama sınırın üstünde: kabul (eski not düzenlenebilir/kısaltılabilir)
    expect(normalizeNotes([{ id: "a", content: long(MAX_NOTE_CONTENT_LENGTH + 1) }], stored)).toMatchObject({
      ok: true,
      repaired: 1,
    });
    // sınır altına inmiş: onarım sayılmaz
    expect(normalizeNotes([{ id: "a", content: long(10) }], stored)).toMatchObject({ ok: true, repaired: 0 });
    // saklıdan bir karakter fazla: red
    expect(normalizeNotes([{ id: "a", content: long(MAX_NOTE_CONTENT_LENGTH + 101) }], stored)).toEqual({
      ok: false,
      error: "note_too_long",
    });
  });

  it("a different note cannot reuse the stored allowance beyond the stored longest", () => {
    const stored = storedLimits([{ id: "a", content: long(MAX_NOTE_CONTENT_LENGTH + 5) }], "content");
    expect(normalizeNotes([{ id: "new", content: long(MAX_NOTE_CONTENT_LENGTH + 6) }], stored)).toEqual({
      ok: false,
      error: "note_too_long",
    });
  });

  it("sınır not başınadır, doküman toplamına değil: saklı tek uzun not diğer notlara da aynı üst sınırı verir (belgelenmiş davranış)", () => {
    const stored = storedLimits(
      [
        { id: "a", content: long(MAX_NOTE_CONTENT_LENGTH + 10_000) },
        { id: "b", content: "kısa" },
      ],
      "content"
    );
    const three = ["a", "b", "c"].map((id) => ({ id, content: long(MAX_NOTE_CONTENT_LENGTH + 10_000) }));
    // Toplam 3 x 60 000 karakter: saklı toplamın (60 004) katı. Sınır toplamı değil tek notu ölçer.
    expect(normalizeNotes(three, stored)).toMatchObject({ ok: true, repaired: 3 });
    // Tek not yine saklı en uzun metni aşamaz.
    expect(normalizeNotes([{ id: "a", content: long(MAX_NOTE_CONTENT_LENGTH + 10_001) }], stored)).toEqual({
      ok: false,
      error: "note_too_long",
    });
  });

  it("without stored data the new limits apply unchanged", () => {
    expect(normalizeNotes([{ id: "a", content: long(MAX_NOTE_CONTENT_LENGTH + 1) }])).toEqual({
      ok: false,
      error: "note_too_long",
    });
    expect(normalizeNotes([{ id: "a", content: long(MAX_NOTE_CONTENT_LENGTH + 1) }], storedLimits(undefined, "content"))).toEqual({
      ok: false,
      error: "note_too_long",
    });
  });

  it("a stored list above the count limit may stay the same size or shrink, never grow", () => {
    const stored = storedLimits(Array.from({ length: MAX_NOTES + 10 }, (_, i) => ({ id: `b${i}` })), "content");
    const same = Array.from({ length: MAX_NOTES + 10 }, (_, i) => ({ id: `b${i}` }));
    expect(normalizeNotes(same, stored)).toMatchObject({ ok: true, repaired: 1 });
    expect(normalizeNotes(same.slice(0, MAX_NOTES + 3), stored)).toMatchObject({ ok: true, repaired: 1 });
    expect(normalizeNotes(same.slice(0, MAX_NOTES), stored)).toMatchObject({ ok: true, repaired: 0 });
    expect(normalizeNotes([...same, { id: "extra" }], stored)).toEqual({ ok: false, error: "too_many_notes" });
  });

  it("relations: over-long note and count follow the same rule", () => {
    const stored = storedLimits(
      [{ targetFileId: "f1", note: long(MAX_RELATION_NOTE_LENGTH + 50) }],
      "note"
    );
    expect(
      normalizeRelations([{ targetFileId: "f1", note: long(MAX_RELATION_NOTE_LENGTH + 50) }], stored)
    ).toMatchObject({ ok: true, repaired: 1 });
    expect(
      normalizeRelations([{ targetFileId: "f1", note: long(MAX_RELATION_NOTE_LENGTH + 51) }], stored)
    ).toEqual({ ok: false, error: "relation_note_too_long" });

    const storedMany = storedLimits(Array.from({ length: MAX_RELATIONS + 2 }, (_, i) => ({ targetFileId: `f${i}` })), "note");
    const same = Array.from({ length: MAX_RELATIONS + 2 }, (_, i) => ({ targetFileId: `f${i}` }));
    expect(normalizeRelations(same, storedMany)).toMatchObject({ ok: true, repaired: 1 });
    expect(normalizeRelations([...same, { targetFileId: "extra" }], storedMany)).toEqual({
      ok: false,
      error: "too_many_relations",
    });
  });

  it("abuse checks that are not limits stay strict even with stored data", () => {
    const stored = { count: 1000, longest: 900_000 };
    expect(normalizeNotes([{ id: "a", content: { a: 1 } }], stored)).toEqual({ ok: false, error: "invalid_note" });
    expect(normalizeNotes(["str"], stored)).toEqual({ ok: false, error: "invalid_note" });
    expect(normalizeRelations([{ targetFileId: "f1", note: { a: 1 } }], stored)).toEqual({
      ok: false,
      error: "invalid_relation",
    });
  });
});
