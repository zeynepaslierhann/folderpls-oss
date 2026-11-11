/**
 * Merge multiple already-in-memory DriveFile lists (e.g. the current folder's
 * children + a previously-fetched graph snapshot) into one deduped list for
 * the search engine to index.
 *
 * This does not fetch anything — it only widens the search engine's view to
 * whatever the page already has loaded from earlier, unrelated Drive calls,
 * partially offsetting the fact that search v2 no longer queries Drive's
 * global full-text search API (see docs/arama-v2.md).
 */

import type { DriveFile } from "@/lib/types";

export function mergeFileSources(...sources: DriveFile[][]): DriveFile[] {
  const byId = new Map<string, DriveFile>();
  for (const list of sources) {
    for (const file of list) byId.set(file.id, file);
  }
  return Array.from(byId.values());
}
