/**
 * Turkish-aware text normalization for search.
 *
 * Goals:
 * - Case-insensitive, including Turkish's dotted/dotless I (İ/I/ı/i).
 * - Diacritic-insensitive (ş/ğ/ü/ö/ç and common Latin accents) so a user
 *   typing without a Turkish keyboard ("sirket") still finds "şirket".
 * - 1:1 character-index mapping vs. the original string, so ranges computed
 *   on the normalized text can be reused directly to highlight the original
 *   text (see `highlight.ts`). This rules out Unicode NFD decomposition,
 *   which can change string length.
 */

// Direct single-character fold map. Keeping this a direct char->char map
// (instead of NFD + combining-mark stripping) guarantees normalize(s).length
// tracks 1:1 with s.length, which `highlight.ts` depends on.
const FOLD_MAP: Record<string, string> = {
  İ: "i",
  I: "i",
  ı: "i",
  Ş: "s",
  ş: "s",
  Ğ: "g",
  ğ: "g",
  Ü: "u",
  ü: "u",
  Ö: "o",
  ö: "o",
  Ç: "c",
  ç: "c",
  // Common Latin accents that show up in imported/shared file names.
  á: "a",
  à: "a",
  â: "a",
  ä: "a",
  ã: "a",
  Á: "a",
  À: "a",
  Â: "a",
  Ä: "a",
  Ã: "a",
  é: "e",
  è: "e",
  ê: "e",
  ë: "e",
  É: "e",
  È: "e",
  Ê: "e",
  Ë: "e",
  í: "i",
  ì: "i",
  î: "i",
  ï: "i",
  Í: "i",
  Ì: "i",
  Î: "i",
  Ï: "i",
  ó: "o",
  ò: "o",
  ô: "o",
  õ: "o",
  Ó: "o",
  Ò: "o",
  Ô: "o",
  Õ: "o",
  ú: "u",
  ù: "u",
  û: "u",
  Ú: "u",
  Ù: "u",
  Û: "u",
  ñ: "n",
  Ñ: "n",
};

/**
 * Fold a string to a case/diacritic-insensitive canonical form.
 * `normalizeTr(s).length === s.length` always holds (pure char-by-char map),
 * which highlight range math relies on.
 */
export function normalizeTr(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const folded = FOLD_MAP[ch];
    out += folded ?? ch.toLowerCase();
  }
  return out;
}

/** A single token plus where it sits in the (normalized, 1:1 with original) source string. */
export interface PositionedToken {
  text: string;
  start: number;
  end: number; // exclusive
}

const TOKEN_SPLIT_RE = /[^\p{L}\p{N}]+/u;

/** Split a normalized string into word tokens, keeping original offsets for highlighting. */
export function tokenizeWithPositions(normalized: string): PositionedToken[] {
  const tokens: PositionedToken[] = [];
  let start = -1;
  for (let i = 0; i <= normalized.length; i++) {
    const ch = normalized[i];
    const isBoundary = ch === undefined || TOKEN_SPLIT_RE.test(ch);
    if (!isBoundary) {
      if (start === -1) start = i;
    } else if (start !== -1) {
      tokens.push({ text: normalized.slice(start, i), start, end: i });
      start = -1;
    }
  }
  return tokens;
}

/** Convenience: tokenize raw text (normalizes first) into plain strings. */
export function tokenize(input: string): string[] {
  return tokenizeWithPositions(normalizeTr(input)).map((t) => t.text);
}
