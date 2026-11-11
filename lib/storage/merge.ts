/**
 * Anlık görüntü birleştirme: öğe bazlı son yazan kazanır, silmeler tombstone ile.
 * Birleştirme değişmeli ve tekrar uygulanabilir olmalı: iki cihaz aynı iki kopyayı
 * hangi sırayla birleştirirse birleştirsin aynı sonuca varır.
 */
import { buildSnapshot, type SnapshotData, type SnapshotItem, type SnapshotTombstone, type TagsSnapshot, type TombstoneKind } from "./snapshot";

export interface MergeStats {
  added: number;
  updated: number;
  removed: number;
  /** Yerelde yeni ya da yeni tarihli tombstone sayısı. */
  tombstones: number;
}

export function hasMergeChanges(stats: MergeStats): boolean {
  return stats.added + stats.updated + stats.removed + stats.tombstones > 0;
}

function timeOf(iso: string): number {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? 0 : time;
}

/** Aynı anda yazılmış iki sürümde içerik karşılaştırılır; iki cihaz da aynı kazananı seçer. */
function newer<T extends { updatedAt: string }>(a: T, b: T): T {
  const diff = timeOf(a.updatedAt) - timeOf(b.updatedAt);
  if (diff !== 0) return diff > 0 ? a : b;
  return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
}

const tombstoneKey = (kind: TombstoneKind, id: string) => `${kind}:${id}`;

function mergeTombstones(a: SnapshotTombstone[], b: SnapshotTombstone[]): Map<string, SnapshotTombstone> {
  const out = new Map<string, SnapshotTombstone>();
  for (const tombstone of [...a, ...b]) {
    const key = tombstoneKey(tombstone.kind, tombstone.id);
    const current = out.get(key);
    if (!current || timeOf(tombstone.deletedAt) > timeOf(current.deletedAt)) out.set(key, tombstone);
  }
  return out;
}

/** Kayıt ile tombstone arasında daha yeni olan kalır; eşitlikte silme kazanır. */
function mergeRecords<T extends { updatedAt: string }>(
  kind: TombstoneKind,
  idOf: (record: T) => string,
  a: T[],
  b: T[],
  tombstones: Map<string, SnapshotTombstone>
): T[] {
  const winners = new Map<string, T>();
  for (const record of [...a, ...b]) {
    const id = idOf(record);
    const current = winners.get(id);
    winners.set(id, current ? newer(current, record) : record);
  }

  const out: T[] = [];
  for (const [id, record] of winners) {
    const key = tombstoneKey(kind, id);
    const tombstone = tombstones.get(key);
    if (tombstone && timeOf(tombstone.deletedAt) >= timeOf(record.updatedAt)) continue;
    tombstones.delete(key);
    out.push(record);
  }
  return out.sort((x, y) => (idOf(x) < idOf(y) ? -1 : idOf(x) > idOf(y) ? 1 : 0));
}

function diffInto<T>(stats: MergeStats, idOf: (record: T) => string, before: T[], after: T[]): void {
  const previous = new Map(before.map((record) => [idOf(record), JSON.stringify(record)]));
  const next = new Set(after.map(idOf));
  for (const record of after) {
    const old = previous.get(idOf(record));
    if (old === undefined) stats.added += 1;
    else if (old !== JSON.stringify(record)) stats.updated += 1;
  }
  for (const id of previous.keys()) if (!next.has(id)) stats.removed += 1;
}

export function mergeSnapshots(local: TagsSnapshot, incoming: TagsSnapshot): { snapshot: TagsSnapshot; stats: MergeStats } {
  const tombstones = mergeTombstones(local.tombstones, incoming.tombstones);

  const labels = mergeRecords("label", (l) => l.id, local.labels, incoming.labels, tombstones);
  const propertyDefinitions = mergeRecords("propertyDefinition", (p) => p.id, local.propertyDefinitions, incoming.propertyDefinitions, tombstones);
  const collections = mergeRecords("collection", (c) => c.id, local.collections, incoming.collections, tombstones);
  const mergedItems = mergeRecords("item", (i) => i.itemId, local.items, incoming.items, tombstones);

  // Çevrimdışı bir cihazda etiketlenmiş öğe, başka cihazda silinmiş etiketi hâlâ
  // taşıyabilir. `updatedAt` değişmez: bu temizlik her iki cihazda da aynı çalışır.
  const items = mergedItems.map((item) => {
    const isDeleted = (id: string) => tombstones.has(tombstoneKey("label", id));
    if (!item.labels.some(isDeleted)) return item;
    const labelExpiries = Object.fromEntries(Object.entries(item.labelExpiries ?? {}).filter(([id]) => !isDeleted(id)));
    const clean = { ...item, labels: item.labels.filter((id) => !isDeleted(id)), labelExpiries };
    if (Object.keys(labelExpiries).length === 0) delete (clean as Partial<SnapshotItem>).labelExpiries;
    return clean;
  });

  const stats: MergeStats = { added: 0, updated: 0, removed: 0, tombstones: 0 };
  diffInto(stats, (l) => l.id, local.labels, labels);
  diffInto(stats, (p) => p.id, local.propertyDefinitions, propertyDefinitions);
  diffInto(stats, (c) => c.id, local.collections, collections);
  diffInto(stats, (i) => i.itemId, local.items, items);

  const localTombstones = new Map(local.tombstones.map((t) => [tombstoneKey(t.kind, t.id), t.deletedAt]));
  for (const [key, tombstone] of tombstones) {
    if (localTombstones.get(key) !== tombstone.deletedAt) stats.tombstones += 1;
  }

  const data: SnapshotData = {
    labels,
    items,
    propertyDefinitions,
    collections,
    tombstones: [...tombstones.values()].sort((x, y) => {
      const a = tombstoneKey(x.kind, x.id);
      const b = tombstoneKey(y.kind, y.id);
      return a < b ? -1 : a > b ? 1 : 0;
    }),
  };
  const exportedAt = timeOf(local.exportedAt) >= timeOf(incoming.exportedAt) ? local.exportedAt : incoming.exportedAt;
  return { snapshot: buildSnapshot(data, exportedAt), stats };
}
