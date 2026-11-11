import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { IndexedDbLabelStore } from "@/lib/storage/indexeddb-label-store";
import { mergeSnapshots } from "@/lib/storage/merge";
import {
  buildSnapshot,
  parseSnapshot,
  serializeSnapshot,
  SNAPSHOT_SCHEMA_VERSION,
  SnapshotError,
  type SnapshotData,
  type SnapshotItem,
  type SnapshotLabel,
  type TagsSnapshot,
} from "@/lib/storage/snapshot";

const T1 = "2026-01-01T00:00:00.000Z";
const T2 = "2026-01-02T00:00:00.000Z";
const T3 = "2026-01-03T00:00:00.000Z";

const label = (id: string, updatedAt: string, name = id): SnapshotLabel => ({ id, name, color: "#B5473A", createdAt: T1, updatedAt });
const item = (itemId: string, updatedAt: string, labels: string[] = []): SnapshotItem => ({
  itemId,
  name: `${itemId}.pdf`,
  type: "file",
  labels,
  properties: {},
  notes: [],
  relations: [],
  addedAt: T1,
  updatedAt,
});
const snapshot = (data: Partial<SnapshotData>): TagsSnapshot =>
  buildSnapshot({ labels: [], items: [], propertyDefinitions: [], collections: [], tombstones: [], ...data }, T1);
const fileOf = (over: Record<string, unknown>) => JSON.stringify({ schemaVersion: SNAPSHOT_SCHEMA_VERSION, app: "folderpls-tags", exportedAt: T1, ...over });

let counter = 0;
const newStore = () => new IndexedDbLabelStore(`merge-${++counter}`);
const errorCode = (fn: () => unknown) => {
  try {
    fn();
  } catch (err) {
    return (err as SnapshotError).code;
  }
  return null;
};

describe("şema dönüşü", () => {
  it("dışa aktar → JSON → içe aktar kayıpsız: ikinci cihazın dökümü birebir aynı", async () => {
    const a = newStore();
    await a.createLabel({ id: "l1", name: "Fatura", color: "#B5473A" });
    await a.tagItem({ itemId: "f1", name: "a.pdf", type: "file", mimeType: "application/pdf", labels: ["l1"], labelExpiries: { l1: 1893456000000 } });
    await a.updateItemProperty("f1", "status", ["x", "y"]);
    await a.updateItemContent("f1", {
      notes: [{ id: "n1", type: "todo", content: "öde", checked: true, createdAt: new Date(T1) }],
      relations: [{ targetFileId: "f2", relationType: "version", note: "eski", createdAt: new Date(T1) }],
    });
    await a.savePropertyDefinition({
      id: "p1",
      name: "Öncelik",
      type: "select",
      options: [{ id: "o1", name: "Yüksek", color: "hsl(var(--status-draft))", isPreset: true }],
      createdAt: new Date(T1),
    });
    await a.saveCollection({ name: "Faturalar", filterGroup: { logic: "and", conditions: [] }, color: "#476CA6" });
    await a.createLabel({ id: "gone", name: "Silinen", color: "#B5473A" });
    await a.updateLabels([], ["gone"]);

    const exported = await a.exportSnapshot();
    const { snapshot: parsed, skipped } = parseSnapshot(serializeSnapshot(exported));
    expect(skipped).toBe(0);

    const b = newStore();
    await b.importSnapshot(parsed);
    const imported = await b.exportSnapshot();
    expect({ ...imported, exportedAt: "" }).toEqual({ ...exported, exportedAt: "" });
    expect(imported.tombstones.map((t) => t.id)).toEqual(["gone"]);
  });

  it("dosya sürümü ve uygulama kimliği taşır", () => {
    const parsed = JSON.parse(serializeSnapshot(snapshot({})));
    expect(parsed).toMatchObject({ schemaVersion: 1, app: "folderpls-tags" });
  });

  it("uygulamadan yeni sürüm reddedilir, eksik yapı FolderPls yedeği sayılmaz", () => {
    expect(errorCode(() => parseSnapshot(fileOf({ schemaVersion: 2 })))).toBe("unsupported_version");
    expect(errorCode(() => parseSnapshot('{"schemaVersion":1}'))).toBe("not_folderpls");
    expect(errorCode(() => parseSnapshot("{bozuk"))).toBe("invalid_json");
    expect(errorCode(() => parseSnapshot(fileOf({ labels: "yok" })))).toBe("not_folderpls");
  });

  it("bozuk kayıt atlanır ve sayılır, sağlam kayıt alınır", () => {
    const { snapshot: parsed, skipped } = parseSnapshot(
      fileOf({
        labels: [label("ok", T1), { ...label("css", T1), color: "url(http://evil)" }, { id: "tarihsiz", name: "x", color: "#B5473A" }],
        items: [item("f1", T1), { ...item("a/b", T1) }],
        tombstones: [{ kind: "label", id: "x", deletedAt: T1 }, { kind: "bilinmeyen", id: "y", deletedAt: T1 }],
      })
    );
    expect(parsed.labels.map((l) => l.id)).toEqual(["ok"]);
    expect(parsed.items.map((i) => i.itemId)).toEqual(["f1"]);
    expect(parsed.tombstones).toHaveLength(1);
    expect(skipped).toBe(4);
  });

  it("`__proto__` anahtarı prototipi değiştirmez", () => {
    const text = fileOf({ items: [item("f1", T1)] }).replace('"properties":{}', '"properties":{"__proto__":"x","ok":1}');
    const { snapshot: parsed } = parseSnapshot(text);
    expect(Object.keys(parsed.items[0].properties)).toEqual(["ok"]);
    expect(Object.getPrototypeOf(parsed.items[0].properties)).toBe(Object.prototype);
  });

  it("seçenek rengi yalnız güvenli biçimlerde kalır", () => {
    const { snapshot: parsed } = parseSnapshot(
      fileOf({
        propertyDefinitions: [
          { id: "p", name: "P", type: "select", createdAt: T1, updatedAt: T1, options: [{ id: "o", name: "O", color: "url(x)" }] },
        ],
      })
    );
    expect(parsed.propertyDefinitions[0].options?.[0].color).toBe("#476CA6");
  });
});

describe("birleştirme: son yazan kazanır", () => {
  it("her öğede yeni olan kazanır, iki yönde de", () => {
    const a = snapshot({ items: [item("f1", T2, ["a"]), item("f2", T1, ["a"])] });
    const b = snapshot({ items: [item("f1", T1, ["b"]), item("f2", T2, ["b"])] });
    const merged = mergeSnapshots(a, b).snapshot;
    expect(merged.items.map((i) => i.labels)).toEqual([["a"], ["b"]]);
  });

  it("aynı damgada iki cihaz aynı sonucu seçer (değişmeli)", () => {
    const a = snapshot({ labels: [label("l", T2, "A")], items: [item("f1", T2, ["x"])] });
    const b = snapshot({ labels: [label("l", T2, "B")], items: [item("f1", T2, ["y"])] });
    const ab = mergeSnapshots(a, b).snapshot;
    const ba = mergeSnapshots(b, a).snapshot;
    expect(ab.labels).toEqual(ba.labels);
    expect(ab.items).toEqual(ba.items);
  });

  it("tekrar birleştirmek sonucu değiştirmez, değişiklik saymaz", () => {
    const a = snapshot({ items: [item("f1", T2)], tombstones: [{ kind: "label", id: "x", deletedAt: T1 }] });
    const b = snapshot({ items: [item("f2", T1)], tombstones: [{ kind: "item", id: "z", deletedAt: T3 }] });
    const once = mergeSnapshots(a, b).snapshot;
    const twice = mergeSnapshots(once, b);
    expect(twice.snapshot).toEqual(once);
    expect(twice.stats).toEqual({ added: 0, updated: 0, removed: 0, tombstones: 0 });
  });

  it("istatistik yerele göre sayar", () => {
    const local = snapshot({ items: [item("same", T1), item("old", T1), item("dead", T1)] });
    const incoming = snapshot({
      items: [item("same", T1), item("old", T2, ["n"]), item("new", T1)],
      tombstones: [{ kind: "item", id: "dead", deletedAt: T2 }],
    });
    expect(mergeSnapshots(local, incoming).stats).toEqual({ added: 1, updated: 1, removed: 1, tombstones: 1 });
  });
});

describe("tombstone", () => {
  const tomb = (kind: "item" | "label", id: string, deletedAt: string) => ({ kind, id, deletedAt });

  it("silme eski kaydı yener ve kalır", () => {
    const a = snapshot({ items: [item("f1", T1)] });
    const b = snapshot({ tombstones: [tomb("item", "f1", T2)] });
    const merged = mergeSnapshots(a, b).snapshot;
    expect(merged.items).toEqual([]);
    expect(merged.tombstones).toHaveLength(1);
  });

  it("silmeden sonra yazılan kayıt geri gelir, tombstone kalkar", () => {
    const a = snapshot({ items: [item("f1", T3)] });
    const b = snapshot({ tombstones: [tomb("item", "f1", T2)] });
    const merged = mergeSnapshots(a, b).snapshot;
    expect(merged.items.map((i) => i.itemId)).toEqual(["f1"]);
    expect(merged.tombstones).toEqual([]);
  });

  it("aynı anda silme ile yazmada silme kazanır", () => {
    const a = snapshot({ items: [item("f1", T2)] });
    const b = snapshot({ tombstones: [tomb("item", "f1", T2)] });
    expect(mergeSnapshots(a, b).snapshot.items).toEqual([]);
    expect(mergeSnapshots(b, a).snapshot.items).toEqual([]);
  });

  it("çevrimdışı cihazın öğesindeki silinmiş etiket temizlenir, öğe damgası değişmez", () => {
    const a = snapshot({ labels: [label("keep", T1)], tombstones: [tomb("label", "gone", T2)] });
    const b = snapshot({
      labels: [label("gone", T1), label("keep", T1)],
      items: [{ ...item("f1", T3, ["gone", "keep"]), labelExpiries: { gone: 1, keep: 2 } }],
    });
    const merged = mergeSnapshots(a, b).snapshot;
    expect(merged.labels.map((l) => l.id)).toEqual(["keep"]);
    expect(merged.items[0]).toMatchObject({ labels: ["keep"], labelExpiries: { keep: 2 }, updatedAt: T3 });
  });

  it("iki cihaz arasında silme yayılır (uçtan uca, gerçek depo)", async () => {
    const a = newStore();
    const b = newStore();
    await a.createLabel({ id: "l1", name: "A", color: "#B5473A" });
    await a.tagItem({ itemId: "f1", name: "a.pdf", type: "file", labels: ["l1"] });
    await b.importSnapshot(await a.exportSnapshot());

    await a.updateLabels([], ["l1"]);
    await a.deleteItem("f1");
    await b.importSnapshot(await a.exportSnapshot());

    expect((await b.loadDefinitions()).labels).toEqual([]);
    expect(await b.listTaggedItems()).toEqual({});
    expect((await b.exportSnapshot()).tombstones.map((t) => t.id).sort()).toEqual(["f1", "l1"]);
  });

  it("ileri saatli kaydın üstüne yazılan yerel değişiklik kaybolmaz", async () => {
    const store = newStore();
    const future = new Date(Date.now() + 86_400_000).toISOString();
    await store.importSnapshot(snapshot({ items: [item("f1", future, ["remote"])] }));
    await store.addLabelToItem("f1", "local");

    const after = (await store.exportSnapshot()).items[0];
    expect(Date.parse(after.updatedAt)).toBeGreaterThan(Date.parse(future));
    const merged = mergeSnapshots(await store.exportSnapshot(), snapshot({ items: [item("f1", future, ["remote"])] })).snapshot;
    expect(merged.items[0].labels).toEqual(["remote", "local"]);
  });

  it("içe aktarma yerel yeni kaydı ezmez", async () => {
    const store = newStore();
    await store.createLabel({ id: "l1", name: "Yeni", color: "#B5473A" });
    const stats = await store.importSnapshot(snapshot({ labels: [label("l1", T1, "Eski")] }));
    expect((await store.loadDefinitions()).labels[0].name).toBe("Yeni");
    expect(stats.updated).toBe(0);
  });
});

describe("tombstone sonrası yeniden oluşturma (saat farkı)", () => {
  // Damga saati modül genelinde tekdüze ilerler (önceki testler ileri kayıt yazdı):
  // "şimdi" bu cihazın son damgasıdır, duvar saati değil.
  let now = 0;
  beforeEach(async () => {
    const probe = newStore();
    await probe.createLabel({ id: "probe", name: "probe", color: "#B5473A" });
    now = Date.parse((await probe.exportSnapshot()).labels[0].updatedAt);
  });
  const at = (offsetMs: number) => new Date(now + offsetMs).toISOString();
  const remoteWith = (deletedAt: string) =>
    snapshot({
      tombstones: [
        { kind: "item", id: "f1", deletedAt },
        { kind: "label", id: "l1", deletedAt },
        { kind: "propertyDefinition", id: "p1", deletedAt },
      ],
    });

  /** Uzak yedek eşitlemeden sonra da tombstone'u taşır: bir sonraki tur onu yeniden getirir. */
  async function recreateAfter(deletedAt: string) {
    const store = newStore();
    const remote = remoteWith(deletedAt);
    await store.importSnapshot(remote, { origin: "sync" });
    await store.createLabel({ id: "l1", name: "Yeni", color: "#B5473A" });
    await store.tagItem({ itemId: "f1", name: "a.pdf", type: "file", labels: ["l1"] });
    await store.savePropertyDefinition({ id: "p1", name: "Öncelik", type: "text", createdAt: new Date() });
    const local = await store.exportSnapshot();
    await store.importSnapshot(remote, { origin: "sync" });
    return { store, local, merged: mergeSnapshots(local, remote).snapshot };
  }

  it("+60 sn ileri tombstone: öğe, etiket ve özellik eşitlemede korunur", async () => {
    const deletedAt = at(60_000);
    const { store, local, merged } = await recreateAfter(deletedAt);

    for (const record of [local.items[0], local.labels[0], local.propertyDefinitions[0]]) {
      expect(Date.parse(record.updatedAt)).toBeGreaterThan(Date.parse(deletedAt));
    }
    expect(local.tombstones).toEqual([]);
    expect(merged.items.map((i) => [i.itemId, i.labels])).toEqual([["f1", ["l1"]]]);
    expect(merged.labels.map((l) => l.id)).toEqual(["l1"]);
    expect(merged.propertyDefinitions.map((p) => p.id)).toEqual(["p1"]);
    expect(merged.tombstones).toEqual([]);

    expect(Object.keys(await store.listTaggedItems())).toEqual(["f1"]);
    expect((await store.loadDefinitions()).labels.map((l) => l.id)).toEqual(["l1"]);
  });

  it("−60 sn geçmiş tombstone: kayıt korunur, damga ileri itilmez", async () => {
    const deletedAt = at(-60_000);
    const { local, merged } = await recreateAfter(deletedAt);

    expect(Date.parse(local.items[0].updatedAt)).toBeLessThan(now + 5_000);
    expect(merged.items.map((i) => i.itemId)).toEqual(["f1"]);
    expect(merged.labels.map((l) => l.id)).toEqual(["l1"]);
    expect(merged.tombstones).toEqual([]);
  });

  it("yerelde bilinmeyen ileri tombstone kaydı hâlâ siler (son yazan kazanır)", () => {
    const local = snapshot({ items: [item("f1", at(0))] });
    expect(mergeSnapshots(local, remoteWith(at(60_000))).snapshot.items).toEqual([]);
  });

  it("etiket silinince onu taşıyan öğeler temizlenir; ileri tombstone sonrası yeniden eklenen etiket kalır", async () => {
    const store = newStore();
    await store.createLabel({ id: "l1", name: "A", color: "#B5473A" });
    await store.createLabel({ id: "keep", name: "B", color: "#B5473A" });
    await store.tagItem({ itemId: "f1", name: "a.pdf", type: "file", labels: ["l1", "keep"], labelExpiries: { l1: 1, keep: 2 } });

    const remote = snapshot({ tombstones: [{ kind: "label", id: "l1", deletedAt: at(60_000) }] });
    await store.importSnapshot(remote, { origin: "sync" });
    expect((await store.listTaggedItems()).f1).toMatchObject({ labels: ["keep"], labelExpiries: { keep: 2 } });

    await store.createLabel({ id: "l1", name: "A", color: "#B5473A" });
    await store.addLabelToItem("f1", "l1");
    await store.importSnapshot(remote, { origin: "sync" });
    expect((await store.listTaggedItems()).f1.labels).toEqual(["keep", "l1"]);

    await store.updateLabels([], ["l1"]);
    expect((await store.listTaggedItems()).f1.labels).toEqual(["keep"]);
    const tomb = (await store.exportSnapshot()).tombstones.find((t) => t.id === "l1");
    expect(mergeSnapshots(await store.exportSnapshot(), remote).snapshot.items[0].labels).toEqual(["keep"]);
    expect(tomb).toBeDefined();
  });
});

describe("girdi sınırları (dış kaynaktan gelen yedek)", () => {
  const long = "x".repeat(1025);

  it("özellik değerleri metin alanlarıyla aynı uzunlukta kesilir; dizi öğe sayısı ve öğe uzunluğu sınırlı", () => {
    const properties = {
      ok: "kısa",
      sinirda: "x".repeat(1024),
      uzun: long,
      sayi: 3,
      sonsuzDegil: null,
      bayrak: true,
      dizi: ["a", "b"],
      kalabalik: Array.from({ length: 101 }, (_, i) => `v${i}`),
      uzunOge: ["a", long],
      karisik: ["a", 1],
      nesne: { a: 1 },
    };
    const { snapshot: parsed } = parseSnapshot(fileOf({ items: [{ ...item("f1", T1), properties }] }));
    expect(Object.keys(parsed.items[0].properties).sort()).toEqual(["bayrak", "dizi", "ok", "sayi", "sinirda"]);
  });

  it("öğe başına özellik sayısı sınırlı", () => {
    const properties = Object.fromEntries(Array.from({ length: 250 }, (_, i) => [`p${i}`, i]));
    const { snapshot: parsed } = parseSnapshot(fileOf({ items: [{ ...item("f1", T1), properties }] }));
    expect(Object.keys(parsed.items[0].properties)).toHaveLength(200);
  });

  it("yerel depo sınırı aşan özellik değerini yazmaz", async () => {
    const store = newStore();
    await expect(store.updateItemProperty("f1", "p", long)).rejects.toThrow();
    await expect(store.updateItemProperty("f1", "p", Array.from({ length: 101 }, () => "a"))).rejects.toThrow();
    await store.updateItemProperty("f1", "p", "x".repeat(1024));
    expect((await store.listTaggedItems()).f1.properties.p).toHaveLength(1024);
  });

  it("koleksiyon koşulları beyaz listeden geçer; bilinmeyen alan, işleç, null ve geçersiz değer ayıklanır", () => {
    const conditions = [
      { id: "c1", fieldType: "name", operator: "contains", value: "fatura", extra: "<script>" },
      { id: "c2", fieldType: "label", operator: "has_label", value: ["l1", "l2"] },
      { id: "c3", fieldType: "property", fieldId: "p1", fieldName: "Öncelik", operator: "greater_than", value: 5 },
      { id: "c4", fieldType: "date_modified", operator: "between", value: [T1, T2] },
      { id: "c5", fieldType: "name", operator: "equals", value: null },
      { id: "c6", fieldType: "name", operator: "equals", value: { evil: true } },
      { id: "c7", fieldType: "property", operator: "equals", value: Number.MAX_VALUE * 10 },
      { id: "c8", fieldType: "name", operator: "contains", value: long },
      { id: "x1", fieldType: "script", operator: "contains", value: "a" },
      { id: "x2", fieldType: "name", operator: "regex", value: ".*" },
      { fieldType: "name", operator: "contains" },
      null,
      "metin",
    ];
    const { snapshot: parsed, skipped } = parseSnapshot(
      fileOf({
        collections: [{ id: "col", name: "C", createdAt: T1, updatedAt: T1, filterGroup: { logic: "and", conditions, extra: 1 } }],
      })
    );
    expect(skipped).toBe(0);
    const group = parsed.collections[0].filterGroup;
    expect(Object.keys(group).sort()).toEqual(["conditions", "logic"]);
    expect(group.conditions).toEqual([
      { id: "c1", fieldType: "name", operator: "contains", value: "fatura" },
      { id: "c2", fieldType: "label", operator: "has_label", value: ["l1", "l2"] },
      { id: "c3", fieldType: "property", fieldId: "p1", fieldName: "Öncelik", operator: "greater_than", value: 5 },
      { id: "c4", fieldType: "date_modified", operator: "between", value: [T1, T2] },
      { id: "c5", fieldType: "name", operator: "equals" },
      { id: "c6", fieldType: "name", operator: "equals" },
      { id: "c7", fieldType: "property", operator: "equals" },
      { id: "c8", fieldType: "name", operator: "contains" },
    ]);
  });

  it("bozuk mantık ya da koşul listesi koleksiyonu atlatır", () => {
    const base = { id: "col", name: "C", createdAt: T1, updatedAt: T1 };
    const { snapshot: parsed, skipped } = parseSnapshot(
      fileOf({
        collections: [
          { ...base, filterGroup: { logic: "xor", conditions: [] } },
          { ...base, id: "c2", filterGroup: { logic: "and", conditions: "x" } },
        ],
      })
    );
    expect(parsed.collections).toEqual([]);
    expect(skipped).toBe(2);
  });
});
