/** Recent-search history, kept in this browser only. */

const STORAGE_KEY = "folderpls.recentSearches";
const MAX_ENTRIES = 8;

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadRecentSearches(): string[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string").slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function pushRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed || !hasStorage()) return loadRecentSearches();
  const current = loadRecentSearches();
  const next = [trimmed, ...current.filter((q) => q !== trimmed)].slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full/unavailable (private mode) — recent searches are a nicety, fail silently.
  }
  return next;
}

export function clearRecentSearches(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
