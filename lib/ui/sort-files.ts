/**
 * Liste sıralaması (spec §3): sütun başlığı ya da View ▾ ile. `null` =
 * Drive'ın döndürdüğü sıra (bugünkü davranış). Klasörler her zaman önce.
 */
export type SortKey = "name" | "modified" | "size";
export type SortDir = "asc" | "desc";
export type SortState = { key: SortKey; dir: SortDir } | null;

interface SortableFile {
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string | number;
}

const FOLDER = "application/vnd.google-apps.folder";

export function sortFiles<T extends SortableFile>(files: T[], sort: SortState): T[] {
  if (!sort) return files;
  const sign = sort.dir === "asc" ? 1 : -1;
  const val = (f: T): number | string => {
    if (sort.key === "name") return f.name.toLocaleLowerCase();
    if (sort.key === "modified") return f.modifiedTime ? Date.parse(f.modifiedTime) || 0 : 0;
    return f.size != null ? Number(f.size) || 0 : -1;
  };
  return [...files].sort((a, b) => {
    const fa = a.mimeType === FOLDER ? 0 : 1;
    const fb = b.mimeType === FOLDER ? 0 : 1;
    if (fa !== fb) return fa - fb;
    const va = val(a);
    const vb = val(b);
    const cmp = typeof va === "string" && typeof vb === "string" ? va.localeCompare(vb) : (va as number) - (vb as number);
    return cmp !== 0 ? cmp * sign : a.name.localeCompare(b.name);
  });
}

/** Başlığa tıklama: aynı sütunda yön değişir, üçüncü tık varsayılana döner. */
export function nextSort(current: SortState, key: SortKey): SortState {
  const firstDir: SortDir = key === "name" ? "asc" : "desc";
  if (!current || current.key !== key) return { key, dir: firstDir };
  if (current.dir === firstDir) return { key, dir: firstDir === "asc" ? "desc" : "asc" };
  return null;
}
