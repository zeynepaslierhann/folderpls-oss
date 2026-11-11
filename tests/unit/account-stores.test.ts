import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACTIVE_LABEL_STORE_STORAGE_KEY, DRIVE_BACKUP_STATE_STORAGE_KEY, LEGACY_STORE_MIGRATION_STORAGE_KEY } from "@/lib/constants";
import {
  accountStoreKey,
  activateAccountStore,
  backupStateKeyFor,
  claimLegacyLabels,
  databaseNameFor,
  getAccountStore,
  getActiveStoreKey,
  hasUnclaimedLegacyLabels,
  LEGACY_DATABASE_NAME,
  resetAccountStoresForTests,
} from "@/lib/storage/account-stores";
import { deleteLocalLabelData, getLabelStore } from "@/lib/storage";
import { deleteLocalDatabase, IndexedDbLabelStore } from "@/lib/storage/indexeddb-label-store";
import type { LabelStoreChangeOrigin } from "@/lib/storage/label-store";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
    keys: () => [...values.keys()],
  };
}

let storage: ReturnType<typeof memoryStorage>;
let A: string;
let B: string;
let run = 0;

/** Eski tek depoya her türden kayıt: etiket, öğe, özellik, koleksiyon ve tombstone. */
async function seedLegacy() {
  const legacy = new IndexedDbLabelStore(LEGACY_DATABASE_NAME);
  await legacy.createLabel({ id: "l1", name: "Fatura", color: "#B5473A" });
  await legacy.tagItem({ itemId: "f1", name: "a.pdf", type: "file", labels: ["l1"] });
  await legacy.tagItem({ itemId: "f2", name: "b.pdf", type: "file", labels: [] });
  await legacy.savePropertyDefinition({
    id: "p1",
    name: "Durum",
    type: "text",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  });
  await legacy.updateItemProperty("f1", "p1", "ödendi");
  await legacy.saveCollection({ name: "Faturalar", filterGroup: { operator: "AND", conditions: [] } } as never);
  await legacy.deleteItem("f2");
  return legacy.exportSnapshot();
}

/** Dışa aktarma zamanı dışında aynı içerik. */
const withoutTime = (snapshot: Awaited<ReturnType<typeof seedLegacy>>) => ({ ...snapshot, exportedAt: "" });
const contentOf = async (key: string | null) => withoutTime(await getAccountStore(key).exportSnapshot());

const itemsOf = async (key: string | null) => Object.keys(await getAccountStore(key).listTaggedItems()).sort();

describe("hesap başına depo", () => {
  beforeEach(async () => {
    storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    resetAccountStoresForTests();
    await deleteLocalDatabase(LEGACY_DATABASE_NAME);
    run += 1;
    A = await accountStoreKey(`perm-a-${run}`);
    B = await accountStoreKey(`perm-b-${run}`);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("depo anahtarı kalıcı kimliğin özetidir: kimlik ya da e-posta veritabanı adında geçmez", async () => {
    expect(await accountStoreKey("12345678901234567890")).toBe(await accountStoreKey("12345678901234567890"));
    expect(A).toMatch(/^[0-9a-f]{32}$/);
    expect(A).not.toBe(B);
    expect(databaseNameFor(A)).toBe(`folderpls-tags:account:${A}`);
    expect(databaseNameFor(A)).not.toContain(`perm-a-${run}`);
    expect(backupStateKeyFor(A)).toBe(`${DRIVE_BACKUP_STATE_STORAGE_KEY}:${A}`);
  });

  it("iki hesap arasında veri sızmaz: her hesap yalnız kendi deposunu görür", async () => {
    await activateAccountStore(A, { email: "a@example.com" });
    await getLabelStore().tagItem({ itemId: "onlyA", name: "a.pdf", type: "file", labels: [] });

    await activateAccountStore(B, { email: "b@example.com" });
    expect(await getLabelStore().listTaggedItems()).toEqual({});
    await getLabelStore().tagItem({ itemId: "onlyB", name: "b.pdf", type: "file", labels: [] });

    expect(await itemsOf(A)).toEqual(["onlyA"]);
    expect(await itemsOf(B)).toEqual(["onlyB"]);

    await activateAccountStore(A, { email: "a@example.com" });
    expect(Object.keys(await getLabelStore().listTaggedItems())).toEqual(["onlyA"]);
  });

  it("hesap değişirken verilen yazma eski hesaba değil yeni hesaba gider", async () => {
    await activateAccountStore(A);
    const switching = activateAccountStore(B);
    const write = getLabelStore().tagItem({ itemId: "afterSwitch", name: "x.pdf", type: "file", labels: [] });
    await Promise.all([switching, write]);
    expect(await itemsOf(A)).toEqual([]);
    expect(await itemsOf(B)).toEqual(["afterSwitch"]);
  });

  it("hesap değişince ekranlar 'sync' olayıyla yeniden okur; açık depo kalıcıdır", async () => {
    const origins: LabelStoreChangeOrigin[] = [];
    getLabelStore().subscribe((origin) => origins.push(origin));
    const first = await activateAccountStore(A);
    const second = await activateAccountStore(B);
    const same = await activateAccountStore(B);

    expect(first).toMatchObject({ switched: true, fromOtherAccount: false });
    expect(second).toMatchObject({ switched: true, fromOtherAccount: true });
    expect(same).toMatchObject({ switched: false, fromOtherAccount: false });
    expect(origins).toEqual(["sync", "sync"]);
    expect(storage.getItem(ACTIVE_LABEL_STORE_STORAGE_KEY)).toBe(B);

    resetAccountStoresForTests();
    vi.stubGlobal("localStorage", storage);
    expect(getActiveStoreKey()).toBe(B);
  });

  it("bağlantısızken son hesabın deposu açık kalır; hiç hesap yoksa eski depo açıktır", async () => {
    expect(getActiveStoreKey()).toBeNull();
    await getLabelStore().tagItem({ itemId: "beforeAnyAccount", name: "x.pdf", type: "file", labels: [] });
    expect(await itemsOf(null)).toEqual(["beforeAnyAccount"]);

    await activateAccountStore(A);
    resetAccountStoresForTests();
    vi.stubGlobal("localStorage", storage);
    expect(getActiveStoreKey()).toBe(A);
    expect(Object.keys(await getLabelStore().listTaggedItems())).toEqual(["beforeAnyAccount"]);
  });
});

describe("eski tek depodan geçiş", () => {
  beforeEach(async () => {
    storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    resetAccountStoresForTests();
    await deleteLocalDatabase(LEGACY_DATABASE_NAME);
    run += 1;
    A = await accountStoreKey(`perm-a-${run}`);
    B = await accountStoreKey(`perm-b-${run}`);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("ilk bağlanan hesaba bir kez ve kayıpsız taşınır, eski depo silinir", async () => {
    const before = await seedLegacy();
    storage.setItem(DRIVE_BACKUP_STATE_STORAGE_KEY, JSON.stringify({ revision: 3, syncedRevision: 2, lastBackupAt: 5, paused: false }));

    const result = await activateAccountStore(A, { email: "a@example.com" });

    expect(result.legacy).toBe("migrated");
    expect(await contentOf(A)).toEqual(withoutTime(before));
    expect(before.tombstones.length).toBeGreaterThan(0);
    expect(JSON.parse(storage.getItem(backupStateKeyFor(A))!)).toMatchObject({ revision: 3, syncedRevision: 2 });
    expect(JSON.parse(storage.getItem(LEGACY_STORE_MIGRATION_STORAGE_KEY)!)).toMatchObject({ done: true, target: A });
    expect(await itemsOf(null)).toEqual([]);

    // İkinci hesap eski veriyi almaz; taşıma bir daha çalışmaz.
    const second = await activateAccountStore(B, { email: "b@example.com" });
    expect(second.legacy).toBe("none");
    expect(await itemsOf(B)).toEqual([]);
  });

  it("yarıda kesilen taşıma tekrar çalışır, yalnız aynı hesaba tamamlanır, kayıt çoğalmaz", async () => {
    const before = await seedLegacy();
    const realImport = IndexedDbLabelStore.prototype.importSnapshot;
    vi.spyOn(IndexedDbLabelStore.prototype, "importSnapshot").mockImplementationOnce(async function (this: IndexedDbLabelStore, ...args) {
      await realImport.apply(this, args);
      throw new Error("sekme kapandı");
    });

    await expect(activateAccountStore(A, { email: "a@example.com" })).rejects.toThrow("sekme kapandı");
    expect(JSON.parse(storage.getItem(LEGACY_STORE_MIGRATION_STORAGE_KEY)!)).toMatchObject({ target: A });
    expect(JSON.parse(storage.getItem(LEGACY_STORE_MIGRATION_STORAGE_KEY)!).done).not.toBe(true);
    expect((await getAccountStore(null).exportSnapshot()).items.length).toBe(before.items.length);

    // Bu arada başka hesap bağlanırsa eski veriye dokunmaz.
    const other = await activateAccountStore(B, { email: "b@example.com" });
    expect(other.legacy).toBe("waiting");
    expect(await itemsOf(B)).toEqual([]);
    expect(await hasUnclaimedLegacyLabels()).toBe(false);

    const resumed = await activateAccountStore(A, { email: "a@example.com" });
    expect(resumed.legacy).toBe("migrated");
    expect(await contentOf(A)).toEqual(withoutTime(before));
    expect(await itemsOf(null)).toEqual([]);
  });

  it("kopyalamadan önce kesilirse veri eski depoda kalır, sonraki çalıştırma taşır", async () => {
    const before = await seedLegacy();
    vi.spyOn(IndexedDbLabelStore.prototype, "importSnapshot").mockRejectedValueOnce(new Error("disk dolu"));

    await expect(activateAccountStore(A)).rejects.toThrow("disk dolu");
    expect(await contentOf(null)).toEqual(withoutTime(before));

    await activateAccountStore(A);
    expect(await contentOf(A)).toEqual(withoutTime(before));
  });

  it("yükseltmeden önce kayıtlı hesap varsa yalnız o hesaba taşınır (büyük/küçük harf fark etmez)", async () => {
    const before = await seedLegacy();

    const wrong = await activateAccountStore(B, { email: "b@example.com", legacyOwnerEmail: "a@example.com" });
    expect(wrong.legacy).toBe("waiting");
    expect(await itemsOf(B)).toEqual([]);
    expect(await hasUnclaimedLegacyLabels()).toBe(true);

    const owner = await activateAccountStore(A, { email: "A@Example.com" });
    expect(owner.legacy).toBe("migrated");
    expect(await contentOf(A)).toEqual(withoutTime(before));
    expect(await hasUnclaimedLegacyLabels()).toBe(false);
  });

  it("sahibi tutmayan eski veriyi kullanıcı açıkça açık hesaba taşıyabilir", async () => {
    const before = await seedLegacy();
    await activateAccountStore(B, { email: "b@example.com", legacyOwnerEmail: "a@example.com" });

    expect(await claimLegacyLabels()).toBe("migrated");
    expect(await contentOf(B)).toEqual(withoutTime(before));
    expect(await hasUnclaimedLegacyLabels()).toBe(false);
  });
});

describe("bu tarayıcıdaki verileri silme", () => {
  beforeEach(async () => {
    storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    resetAccountStoresForTests();
    await deleteLocalDatabase(LEGACY_DATABASE_NAME);
    run += 1;
    A = await accountStoreKey(`perm-a-${run}`);
    B = await accountStoreKey(`perm-b-${run}`);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("yalnız açık hesabın deposunu siler, diğer hesabınki kalır", async () => {
    await activateAccountStore(A);
    await getLabelStore().tagItem({ itemId: "keepA", name: "a.pdf", type: "file", labels: [] });
    await activateAccountStore(B);
    await getLabelStore().tagItem({ itemId: "dropB", name: "b.pdf", type: "file", labels: [] });

    await deleteLocalLabelData();

    expect(await getLabelStore().listTaggedItems()).toEqual({});
    expect(await itemsOf(A)).toEqual(["keepA"]);
    expect(getActiveStoreKey()).toBe(B);
  });
});
