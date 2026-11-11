import { describe, expect, it } from "vitest";
import { boundedLevenshtein, isFuzzyMatch, maxDistanceForTerm } from "@/lib/search/fuzzy";

describe("boundedLevenshtein", () => {
  it("returns 0 for identical strings", () => {
    expect(boundedLevenshtein("rapor", "rapor", 2)).toBe(0);
  });

  it("computes small distances within budget", () => {
    expect(boundedLevenshtein("rapor", "rapoo", 2)).toBe(1); // substitution
    expect(boundedLevenshtein("rapor", "raporu", 2)).toBe(1); // insertion
    expect(boundedLevenshtein("rapor", "rpor", 2)).toBe(1); // deletion
  });

  it("returns null when the distance exceeds the budget", () => {
    expect(boundedLevenshtein("rapor", "tamamen farkli", 2)).toBeNull();
  });

  it("short-circuits on length difference alone", () => {
    expect(boundedLevenshtein("ab", "abcdefgh", 1)).toBeNull();
  });
});

describe("maxDistanceForTerm / isFuzzyMatch", () => {
  it("disallows fuzzing very short terms (too risky)", () => {
    expect(maxDistanceForTerm("ab")).toBe(0);
    expect(isFuzzyMatch("ab", "ac")).toBe(false);
  });

  it("tolerates a 1-character typo on medium terms", () => {
    expect(maxDistanceForTerm("rapor")).toBe(1);
    expect(isFuzzyMatch("rapor", "rapoor")).toBe(true); // typo: extra letter
    expect(isFuzzyMatch("rapor", "fatura")).toBe(false);
  });

  it("tolerates 2-character typos on longer terms", () => {
    expect(isFuzzyMatch("sozlesme", "sozlesme")).toBe(true);
    expect(isFuzzyMatch("sozlesme", "sozlesmee")).toBe(true);
  });
});
