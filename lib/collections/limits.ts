/**
 * Koleksiyon giriş sınırları. Saf fonksiyonlar: yerel depo kaydederken ve
 * içe aktarılan yedek okunurken (`lib/storage`) aynı sınırlar uygulanır, böylece
 * keyfi büyüklükte bir koleksiyon tarayıcı deposuna ya da yedeğe yazılmaz.
 */
import type { FilterGroup } from "@/lib/types";

export const MAX_COLLECTION_NAME_LENGTH = 100;
export const MAX_FILTER_GROUP_BYTES = 10 * 1024;

export function isCollectionNameTooLong(name: string): boolean {
  return name.length > MAX_COLLECTION_NAME_LENGTH;
}

/** UTF-8 byte length of the serialized filterGroup — storage cost is bytes, not JS string `.length`. */
export function filterGroupByteSize(filterGroup: FilterGroup): number {
  return new TextEncoder().encode(JSON.stringify(filterGroup)).length;
}

export function isFilterGroupTooLarge(filterGroup: FilterGroup): boolean {
  return filterGroupByteSize(filterGroup) > MAX_FILTER_GROUP_BYTES;
}
