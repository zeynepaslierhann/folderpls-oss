import type { TaggedItem } from "@/lib/types";

/**
 * Sonuç: kaydedilemeyen öğeler (ve yeni oluşan etiket kimlikleri). Tekrar denemede
 * yeni etiketler YENİDEN oluşturulmasın diye çağıran tarafın createdLabelIds'i saklaması gerekir.
 */
export interface BulkLabelResult {
  failedIds: string[];
  createdLabelIds: string[];
}

export interface BulkLabelFileLike {
  id: string;
  name: string;
}

export interface BulkLabelSuccess<T extends BulkLabelFileLike> {
  file: T;
  merged: string[];
}

/** Mevcut etiketlerle yeni etiketleri birleştirir; tekrar uygulamak sonucu değiştirmez (idempotent). */
export function mergeLabelIds(existing: string[] | undefined, added: string[]): string[] {
  return [...new Set([...(existing ?? []), ...added])];
}

/**
 * Her dosyayı bağımsız yazar; biri başarısız olsa diğerleri sürer (Promise.all ilk hatada
 * sonucu kaybettirirdi). Ekranda bulunmayan kimlikler de başarısız sayılır, sessizce atlanmaz.
 */
export async function applyLabelsToFiles<T extends BulkLabelFileLike>(
  fileIds: string[],
  files: T[],
  taggedItems: Record<string, string[]>,
  labelIds: string[],
  save: (file: T, merged: string[]) => Promise<void>
): Promise<{ succeeded: BulkLabelSuccess<T>[]; failedIds: string[] }> {
  const byId = new Map(files.map((f) => [f.id, f]));
  const unique = [...new Set(fileIds)];
  const failedIds: string[] = unique.filter((id) => !byId.has(id));
  const targets = unique.flatMap((id) => {
    const file = byId.get(id);
    return file ? [file] : [];
  });

  const settled = await Promise.allSettled(
    targets.map(async (file) => {
      const merged = mergeLabelIds(taggedItems[file.id], labelIds);
      await save(file, merged);
      return { file, merged };
    })
  );

  const succeeded: BulkLabelSuccess<T>[] = [];
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") succeeded.push(result.value);
    else failedIds.push(targets[i].id);
  });
  return { succeeded, failedIds };
}

/** Başarılı yazımdan sonra yerel meta verisi (var olan korunur, yoksa yeni kayıt). */
export function nextItemMetadata(
  existing: TaggedItem | undefined,
  file: BulkLabelFileLike,
  type: "file" | "folder",
  merged: string[]
): TaggedItem {
  const update = { labels: merged, updatedAt: new Date() };
  if (existing) return { ...existing, ...update };
  return {
    itemId: file.id,
    name: file.name,
    type,
    ...update,
    addedAt: new Date(),
    properties: {},
    notes: [],
    relations: [],
  } as TaggedItem;
}

/** Durum güncelleyicisi: haritanın tek anahtarını yazar, diğerlerine dokunmaz. */
export function withEntry<V>(key: string, value: V) {
  return (map: Record<string, V>): Record<string, V> => ({ ...map, [key]: value });
}
