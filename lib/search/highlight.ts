/**
 * Maps a matched (normalized) token back onto character ranges in the
 * *original* display string, for `<mark>`-style highlighting.
 *
 * This relies on `normalizeTr` being a strict 1:1 character map (see
 * normalize.ts) — the ranges computed on the normalized name apply directly
 * to the original file name.
 */

import type { PositionedToken } from "./normalize";
import type { SearchMatchType } from "./types";

export function rangesForNameMatch(
  nameTokens: PositionedToken[],
  matchedToken: string,
  term: string,
  matchType: SearchMatchType
): [number, number][] {
  const ranges: [number, number][] = [];
  for (const tok of nameTokens) {
    if (tok.text !== matchedToken) continue;
    switch (matchType) {
      case "exact":
        ranges.push([tok.start, tok.end]);
        break;
      case "prefix":
        ranges.push([tok.start, Math.min(tok.end, tok.start + term.length)]);
        break;
      case "substring": {
        const offset = tok.text.indexOf(term);
        if (offset >= 0) ranges.push([tok.start + offset, tok.start + offset + term.length]);
        break;
      }
      case "fuzzy":
        // Character-level alignment isn't meaningful after an edit; highlight the whole token.
        ranges.push([tok.start, tok.end]);
        break;
    }
  }
  return ranges;
}

/** Merge overlapping/adjacent ranges so `<mark>` output doesn't nest or duplicate. */
export function mergeRanges(ranges: [number, number][]): [number, number][] {
  if (ranges.length <= 1) return ranges;
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr[0] <= last[1]) {
      last[1] = Math.max(last[1], curr[1]);
    } else {
      merged.push(curr);
    }
  }
  return merged;
}

export interface TextSegment {
  text: string;
  highlighted: boolean;
}

/** Split `text` into plain/highlighted segments for rendering, given merged ranges. */
export function segmentText(text: string, ranges: [number, number][]): TextSegment[] {
  if (ranges.length === 0) return [{ text, highlighted: false }];
  const merged = mergeRanges(ranges);
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    const s = Math.max(0, Math.min(start, text.length));
    const e = Math.max(s, Math.min(end, text.length));
    if (s > cursor) segments.push({ text: text.slice(cursor, s), highlighted: false });
    if (e > s) segments.push({ text: text.slice(s, e), highlighted: true });
    cursor = e;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), highlighted: false });
  return segments;
}
