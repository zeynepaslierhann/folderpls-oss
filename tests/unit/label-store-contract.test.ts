import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** LabelStore sözleşmesi: gerçek IndexedDB kodu, fake-indexeddb üzerinde. */
vi.mock("@/lib/logger", () => ({ logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { IndexedDbLabelStore } from "@/lib/storage/indexeddb-label-store";
import type { LabelStore } from "@/lib/storage/label-store";
import { parseSnapshot, serializeSnapshot } from "@/lib/storage/snapshot";
import type { FilterGroup, PropertyDefinition } from "@/lib/types";

const RED = "#B5473A";
const BLUE = "#476CA6";
const FILTER: FilterGroup = { logic: "and", conditions: [] };

let dbCounter = 0;

const implementations: Array<[string, () => LabelStore]> = [["local", () => new IndexedDbLabelStore(`contract-${++dbCounter}`)]];

const file = (itemId: string, labels: string[] = []) => ({ itemId, name: `${itemId}.pdf`, type: "file" as const, labels });

describe.each(implementations)("LabelStore sözleşmesi: %s", (_name, create) => {
  let store: LabelStore;
  beforeEach(() => {
    store = create();
  });

  it("etiket oluşturur ve tanımlarla birlikte okur", async () => {
    await store.createLabel({ id: "l1", name: "Fatura", color: RED });
    const { labels, propertyDefinitions } = await store.loadDefinitions();
    expect(labels).toEqual([{ id: "l1", name: "Fatura", color: RED }]);
    expect(propertyDefinitions).toEqual([]);
  });

  it("geçersiz etiket rengini reddeder (CSS'e gider)", async () => {
    await expect(store.createLabel({ id: "x", name: "x", color: "url(http://evil)" })).rejects.toThrow(/Invalid label color/);
  });

  it("etiketi günceller; silinen etiket öğelerden de çıkar", async () => {
    await store.createLabel({ id: "l1", name: "A", color: RED });
    await store.createLabel({ id: "l2", name: "B", color: RED });
    await store.tagItem(file("f1", ["l1", "l2"]));

    await store.updateLabels([{ id: "l1", name: "A2", color: BLUE }], ["l2"]);

    expect((await store.loadDefinitions()).labels).toEqual([{ id: "l1", name: "A2", color: BLUE }]);
    expect((await store.listTaggedItems()).f1.labels).toEqual(["l1"]);
  });

  it("tagItem yeni kayıtta boş özellik ve not açar", async () => {
    await store.tagItem(file("f1", ["l1"]));
    expect(await store.listTaggedItems()).toMatchObject({
      f1: { itemId: "f1", name: "f1.pdf", type: "file", labels: ["l1"], properties: {}, notes: [], relations: [] },
    });
  });

  it("tagItem var olan kaydın notlarını korur; undefined alanı siler", async () => {
    await store.tagItem({ ...file("f1", ["l1"]), labelExpiries: { l1: 123 } });
    await store.updateItemProperty("f1", "status", "done");
    await store.tagItem({ ...file("f1", ["l2"]), labelExpiries: undefined });
    const item = (await store.listTaggedItems()).f1;
    expect(item.labels).toEqual(["l2"]);
    expect(item.properties).toEqual({ status: "done" });
    expect(item.labelExpiries).toBeUndefined();
  });

  it("updateItemProperty öğe yoksa oluşturur, varsa birleştirir", async () => {
    await store.updateItemProperty("f1", "a", 1);
    await store.updateItemProperty("f1", "b", ["x", "y"]);
    expect((await store.listTaggedItems()).f1.properties).toEqual({ a: 1, b: ["x", "y"] });
  });

  it("addLabelToItem öğe yoksa oluşturur ve tekrar eklemez", async () => {
    await store.addLabelToItem("f1", "l1");
    await store.addLabelToItem("f1", "l1");
    expect((await store.listTaggedItems()).f1).toMatchObject({ name: "Unknown File", type: "file", labels: ["l1"] });
  });

  it("removeLabelFromItem ve updateItemLabels öğe yoksa not-found verir", async () => {
    await expect(store.removeLabelFromItem("yok", "l1")).rejects.toMatchObject({ code: "not-found" });
    await expect(store.updateItemLabels("yok", ["l1"])).rejects.toMatchObject({ code: "not-found" });
  });

  it("etiketi öğeden çıkarır ve etiket listesini değiştirir", async () => {
    await store.tagItem(file("f1", ["l1", "l2"]));
    await store.removeLabelFromItem("f1", "l1");
    expect((await store.listTaggedItems()).f1.labels).toEqual(["l2"]);
    await store.updateItemLabels("f1", ["l9"]);
    expect((await store.listTaggedItems()).f1.labels).toEqual(["l9"]);
  });

  it("getItemsByLabel yalnız etiketi taşıyan öğeleri döner", async () => {
    await store.tagItem(file("f1", ["l1"]));
    await store.tagItem(file("f2", ["l2"]));
    expect((await store.getItemsByLabel("l1")).map((i) => i.itemId)).toEqual(["f1"]);
  });

  it("not ve ilişkileri yazar, öğe yoksa oluşturur", async () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    await store.updateItemContent("f1", { notes: [{ id: "n1", type: "text", content: "merhaba", createdAt }] });
    await store.updateItemContent("f1", { relations: [{ targetFileId: "f2", relationType: "related", createdAt }] });
    const item = (await store.listTaggedItems()).f1;
    expect(item.notes).toHaveLength(1);
    expect(item.notes[0]).toMatchObject({ id: "n1", content: "merhaba" });
    expect(item.relations?.[0]).toMatchObject({ targetFileId: "f2", relationType: "related" });
  });

  it("öğeyi siler", async () => {
    await store.tagItem(file("f1"));
    await store.deleteItem("f1");
    expect((await store.listTaggedItems()).f1).toBeUndefined();
  });

  it("özellik tanımını yazar ve siler", async () => {
    const definition: PropertyDefinition = { id: "p1", name: "Durum", type: "text", createdAt: new Date() };
    await store.savePropertyDefinition(definition);
    expect((await store.loadDefinitions()).propertyDefinitions).toMatchObject([{ id: "p1", name: "Durum", type: "text" }]);
    await store.deletePropertyDefinition("p1");
    expect((await store.loadDefinitions()).propertyDefinitions).toEqual([]);
  });

  it("koleksiyon oluşturur, günceller, sırayla listeler ve siler", async () => {
    const first = await store.saveCollection({ name: "Bir", filterGroup: FILTER });
    const second = await store.saveCollection({ name: "İki", filterGroup: FILTER });
    expect(first.id).not.toBe("");

    await store.saveCollection({ id: first.id, name: "Bir+", filterGroup: FILTER });
    expect((await store.listCollections()).map((c) => [c.id, c.name])).toEqual([
      [first.id, "Bir+"],
      [second.id, "İki"],
    ]);

    await store.deleteCollection(first.id);
    expect((await store.listCollections()).map((c) => c.id)).toEqual([second.id]);
  });

  it("anlık görüntüsü şema doğrulamasından kayıpsız geçer", async () => {
    await store.createLabel({ id: "l1", name: "A", color: RED });
    await store.tagItem(file("f1", ["l1"]));
    await store.saveCollection({ name: "K", filterGroup: FILTER });

    const { snapshot, skipped } = parseSnapshot(serializeSnapshot(await store.exportSnapshot()));

    expect(skipped).toBe(0);
    expect(snapshot.labels.map((l) => l.id)).toEqual(["l1"]);
    expect(snapshot.items.map((i) => i.itemId)).toEqual(["f1"]);
    expect(snapshot.collections).toHaveLength(1);
  });
});

describe("yerel uygulamaya özgü", () => {
  it("koleksiyon sınırı yok", async () => {
    const store = new IndexedDbLabelStore(`contract-${++dbCounter}`);
    for (let i = 0; i < 10; i++) await store.saveCollection({ name: `K${i}`, filterGroup: FILTER });
    expect(await store.listCollections()).toHaveLength(10);
  });

  it("veri yeni bağlantıda da durur (sayfa yenileme)", async () => {
    const name = `contract-${++dbCounter}`;
    await new IndexedDbLabelStore(name).tagItem(file("f1", ["l1"]));
    expect((await new IndexedDbLabelStore(name).listTaggedItems()).f1.labels).toEqual(["l1"]);
  });

  it("okunan tarihler Date'tir", async () => {
    const store = new IndexedDbLabelStore(`contract-${++dbCounter}`);
    await store.tagItem(file("f1"));
    const item = (await store.listTaggedItems()).f1;
    expect(item.addedAt).toBeInstanceOf(Date);
    expect(item.updatedAt).toBeInstanceOf(Date);
  });

  it("Drive kimliği olmayan öğe reddedilir", async () => {
    const store = new IndexedDbLabelStore(`contract-${++dbCounter}`);
    await expect(store.tagItem(file("a/b"))).rejects.toThrow(/Invalid item id/);
  });
});
