/**
 * Lightweight, bounded fuzzy matching for typo tolerance.
 *
 * We only ever need to know "is the edit distance <= maxDistance", so the
 * classic DP table is computed with an early-exit band instead of a full
 * O(n*m) fill — this keeps per-keystroke fuzzy lookups cheap even when
 * scanning thousands of candidate tokens.
 */

/**
 * Bounded Levenshtein distance. Returns the real distance if it is
 * <= maxDistance, otherwise returns null (meaning "too far, don't care how far").
 */
export function boundedLevenshtein(a: string, b: string, maxDistance: number): number | null {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > maxDistance) return null;
  if (maxDistance <= 0) return null;

  // Ensure `a` is the shorter string to bound the row width.
  if (la > lb) return boundedLevenshtein(b, a, maxDistance);

  let prevRow = new Array(la + 1);
  for (let i = 0; i <= la; i++) prevRow[i] = i;

  for (let j = 1; j <= lb; j++) {
    const currRow = new Array(la + 1);
    currRow[0] = j;
    let rowMin = currRow[0];
    const colStart = Math.max(1, j - maxDistance);
    const colEnd = Math.min(la, j + maxDistance);
    // Cells outside the band are treated as "too expensive" (maxDistance+1).
    for (let i = 1; i < colStart; i++) currRow[i] = maxDistance + 1;
    for (let i = colStart; i <= colEnd; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const del = (prevRow[i] ?? maxDistance + 1) + 1;
      const ins = (currRow[i - 1] ?? maxDistance + 1) + 1;
      const sub = (prevRow[i - 1] ?? maxDistance + 1) + cost;
      const val = Math.min(del, ins, sub);
      currRow[i] = val;
      if (val < rowMin) rowMin = val;
    }
    for (let i = colEnd + 1; i <= la; i++) currRow[i] = maxDistance + 1;
    if (rowMin > maxDistance) return null; // whole row exceeds budget, no chance of recovering
    prevRow = currRow;
  }

  const dist = prevRow[la];
  return dist <= maxDistance ? dist : null;
}

/** Typo budget scaled to term length: short terms tolerate less noise. */
export function maxDistanceForTerm(term: string): number {
  if (term.length <= 3) return 0; // too short to fuzz safely
  if (term.length <= 5) return 1;
  return 2;
}

export function isFuzzyMatch(term: string, candidate: string): boolean {
  const budget = maxDistanceForTerm(term);
  if (budget === 0) return false;
  return boundedLevenshtein(term, candidate, budget) !== null;
}
