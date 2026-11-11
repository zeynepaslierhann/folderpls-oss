import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Etiket bitiş tarihi: `useLabeledItemsLoader` yüklemede süresi
 * geçen etiketi düşürür, kalıcı olarak yazar (tagItem) ve süresi dolmamış etiketi korur. Davranış değişmedi;
 * bu yalnız mevcut davranışı kilitler. React DOM'suz: kancalar küçük bir sahte ile çalıştırılır.
 */

const hoisted = vi.hoisted(() => ({
  setters: [] as Array<ReturnType<typeof import("vitest").vi.fn>>,
  effects: [] as Array<() => unknown>,
  tagItem: vi.fn(),
  listTaggedItems: vi.fn(),
}));

vi.mock("react", () => ({
  useState: (init: unknown) => {
    const setter = vi.fn();
    hoisted.setters.push(setter);
    return [init, setter];
  },
  useEffect: (fn: () => unknown) => void hoisted.effects.push(fn),
  useCallback: (fn: unknown) => fn,
}));
vi.mock("@/lib/storage", () => ({
  getLabelStore: () => ({
    loadDefinitions: async () => ({ labels: [], propertyDefinitions: [] }),
    listTaggedItems: hoisted.listTaggedItems,
    tagItem: hoisted.tagItem,
  }),
}));
vi.mock("@/lib/logger", () => ({ logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { useLabeledItemsLoader as loadLabeledItems } from "@/lib/hooks/use-labeled-items-loader";

const NOW = Date.parse("2026-10-20T10:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

// useState çağrı sırası: 0 userLabels, 1 taggedItems, 2 itemMetadata, 3 taggedItemsTypes, 4 propertyDefinitions
async function run(items: Record<string, unknown>) {
  hoisted.setters.length = 0;
  hoisted.effects.length = 0;
  hoisted.tagItem.mockReset().mockResolvedValue(undefined);
  hoisted.listTaggedItems.mockReset().mockResolvedValue(items);
  loadLabeledItems();
  hoisted.effects[0]();
  // load() efekt içinde beklenmeden başlar: mikro görev kuyruğunu boşalt
  for (let i = 0; i < 50; i++) await Promise.resolve();
  const last = (i: number) => hoisted.setters[i].mock.calls.at(-1)?.[0];
  return { tagged: last(1) as Record<string, string[]>, meta: last(2) as Record<string, Record<string, unknown>> };
}

describe("etiket bitiş tarihi dolunca etiket kaldırılır", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  it("süresi geçen etiket düşer, süresi dolmamış ve süresiz kalır; kalıcı yazılır", async () => {
    const { tagged, meta } = await run({
      doc1: {
        type: "file",
        labels: ["old", "future", "forever"],
        labelExpiries: { old: NOW - DAY, future: NOW + DAY },
      },
    });
    expect(tagged.doc1).toEqual(["future", "forever"]);
    expect(meta.doc1.labelExpiries).toEqual({ future: NOW + DAY });
    expect(hoisted.tagItem).toHaveBeenCalledTimes(1);
    const [written] = hoisted.tagItem.mock.calls[0];
    expect(written).toMatchObject({ itemId: "doc1", labels: ["future", "forever"], labelExpiries: { future: NOW + DAY } });
  });

  it("tüm etiketleri dolan öğenin etiket listesi boşalır; labelExpiries tamamen kalkar (mevcut davranış: boş kayıt bellekte kalır)", async () => {
    const { tagged } = await run({ doc2: { type: "file", labels: ["old"], labelExpiries: { old: NOW - 1 } } });
    expect(tagged.doc2).toEqual([]);
    expect(hoisted.tagItem.mock.calls[0][0]).toMatchObject({ labels: [], labelExpiries: undefined });
  });

  it("etiketi dolan öğede not varsa öğe kayıtta kalır, etiketsiz", async () => {
    const { tagged } = await run({
      doc3: { type: "folder", labels: ["old"], labelExpiries: { old: NOW - 1 }, notes: [{ id: "n1" }] },
    });
    expect(tagged.doc3).toEqual([]);
  });

  it("tam bitiş anı (exp === şimdi) hâlâ geçerli; hiçbiri dolmadıysa yazma yapılmaz", async () => {
    const { tagged } = await run({ doc4: { type: "file", labels: ["edge"], labelExpiries: { edge: NOW } } });
    expect(tagged.doc4).toEqual(["edge"]);
    expect(hoisted.tagItem).not.toHaveBeenCalled();
  });
});
