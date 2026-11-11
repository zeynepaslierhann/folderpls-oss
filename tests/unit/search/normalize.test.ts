import { describe, expect, it } from "vitest";
import { normalizeTr, tokenize, tokenizeWithPositions } from "@/lib/search/normalize";

describe("normalizeTr", () => {
  it("folds Turkish dotted/dotless I consistently", () => {
    expect(normalizeTr("İstanbul")).toBe("istanbul");
    expect(normalizeTr("Istanbul")).toBe("istanbul"); // ASCII "I" (common typing mistake)
    expect(normalizeTr("ıstanbul")).toBe("istanbul");
  });

  it("folds ş/ğ/ü/ö/ç regardless of case", () => {
    expect(normalizeTr("Şirket")).toBe("sirket");
    expect(normalizeTr("GÜNEŞ")).toBe("gunes");
    expect(normalizeTr("öğrenci")).toBe("ogrenci");
    expect(normalizeTr("Çiçek")).toBe("cicek");
  });

  it("is case-insensitive for plain ASCII", () => {
    expect(normalizeTr("RAPOR")).toBe(normalizeTr("rapor"));
  });

  it("matches keyboard-friendly ASCII typing to the accented original", () => {
    expect(normalizeTr("İŞÇİ")).toBe(normalizeTr("isci"));
    expect(normalizeTr("Şirket Raporu")).toBe(normalizeTr("sirket raporu"));
  });

  it("preserves string length (1:1 char mapping) for highlight range math", () => {
    const cases = ["İstanbul", "Şirket", "Güneş Öğrenci Çiçek", "plain ascii text"];
    for (const s of cases) expect(normalizeTr(s).length).toBe(s.length);
  });
});

describe("tokenize", () => {
  it("splits on non-alphanumeric boundaries", () => {
    expect(tokenize("2024-Yillik_Rapor.pdf")).toEqual(["2024", "yillik", "rapor", "pdf"]);
  });

  it("handles Turkish words as single tokens", () => {
    expect(tokenize("Şirket Raporu")).toEqual(["sirket", "raporu"]);
  });
});

describe("tokenizeWithPositions", () => {
  it("returns offsets that map back onto the normalized (== original length) string", () => {
    const normalized = normalizeTr("Şirket Raporu 2024");
    const tokens = tokenizeWithPositions(normalized);
    expect(tokens.map((t) => t.text)).toEqual(["sirket", "raporu", "2024"]);
    for (const t of tokens) {
      expect(normalized.slice(t.start, t.end)).toBe(t.text);
    }
  });
});
