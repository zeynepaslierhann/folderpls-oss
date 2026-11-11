import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accountStoreKey, activateAccountStore, deleteLocalLabelData, getAccountStore, getLabelStore } from "@/lib/storage";
import { resetAccountStoresForTests } from "@/lib/storage/account-stores";

describe("bu tarayıcıdaki verileri silme", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
    });
    resetAccountStoresForTests();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("açık bağlantı olsa da açık hesabın verisini siler, sonraki okuma boş başlar", async () => {
    await activateAccountStore(await accountStoreKey("reset-a"));
    await getLabelStore().createLabel({ id: "l1", name: "A", color: "#B5473A" });
    expect((await getLabelStore().loadDefinitions()).labels).toHaveLength(1);
    await deleteLocalLabelData();
    expect((await getLabelStore().loadDefinitions()).labels).toEqual([]);
  });

  it("depo hesaba bağlı: nesne aynı kalır, hesap değişince o hesabın verisi okunur, diğeri silinmez", async () => {
    const a = await accountStoreKey("reset-b");
    const b = await accountStoreKey("reset-c");
    const store = getLabelStore();
    await activateAccountStore(a);
    await store.createLabel({ id: "la", name: "A", color: "#B5473A" });

    await activateAccountStore(b);
    expect(getLabelStore()).toBe(store);
    expect((await store.loadDefinitions()).labels).toEqual([]);
    await deleteLocalLabelData();

    expect((await getAccountStore(a).loadDefinitions()).labels.map((label) => label.id)).toEqual(["la"]);
  });
});
