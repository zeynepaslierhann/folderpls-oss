import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  accountStoreKey,
  activateAccountStore,
  getAccountStore,
  getActiveStoreKey,
  resetAccountStoresForTests,
} from "@/lib/storage/account-stores";
import { AUTO_BACKUP_DEBOUNCE_MS, DriveAutoBackup } from "@/lib/storage/auto-backup";
import { syncDriveBackup } from "@/lib/storage/drive-backup";
import { getLabelStore } from "@/lib/storage";
import { createFakeDrive } from "./helpers/fake-drive";

/**
 * İki Google hesabı, iki ayrı (sahte) Drive, aynı tarayıcı. Denetimdeki hata:
 * A'dan sonra B bağlanınca A'nın etiketleri B'nin yedeğine yazılıyordu.
 * Gerçek hesapla doğrulama değildir.
 */
function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

async function settle(ms = 0) {
  await vi.advanceTimersByTimeAsync(ms);
  for (let i = 0; i < 40; i++) await new Promise((resolve) => setImmediate(resolve));
}

const backedUpItems = (drive: ReturnType<typeof createFakeDrive>) =>
  drive.state.remote.flatMap((file) => (JSON.parse(file.content).items as { itemId: string }[]).map((item) => item.itemId)).sort();
const everyUpload = (drive: ReturnType<typeof createFakeDrive>) =>
  drive.state.calls.filter((call) => call.url.includes("/upload/")).map((call) => call.body ?? "(multipart)");

describe("iki hesap, tek tarayıcı", () => {
  const driveA = createFakeDrive();
  const driveB = createFakeDrive();
  let grant: { token: string; storeKey: string | null } | null;
  let A: string;
  let B: string;
  let engine: DriveAutoBackup;
  let stop: () => void;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    vi.stubGlobal("localStorage", memoryStorage());
    resetAccountStoresForTests();
    driveA.reset();
    driveB.reset();
    vi.stubGlobal("fetch", (input: string, init: RequestInit = {}) => {
      const auth = new Headers(init.headers).get("Authorization");
      return (auth === "Bearer tokenA" ? driveA : driveB).fetch(input, init);
    });
    A = await accountStoreKey(`iso-a-${Math.random()}`);
    B = await accountStoreKey(`iso-b-${Math.random()}`);
    grant = null;
    engine = new DriveAutoBackup({
      getStore: getAccountStore,
      // Sağlayıcıdaki kural: jeton yalnız açık deponun hesabınınsa verilir.
      getBinding: () => {
        const storeKey = getActiveStoreKey();
        return { storeKey, token: grant && grant.storeKey === storeKey ? grant.token : null };
      },
      onAuthError: () => undefined,
      sync: syncDriveBackup,
      withLock: (run) => run(),
      getStorage: () => localStorage,
    });
    stop = engine.start();
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("A'nın etiketleri B'nin Drive'ına hiçbir aşamada yazılmaz", async () => {
    await activateAccountStore(A);
    grant = { token: "tokenA", storeKey: A };
    engine.refresh();
    await getLabelStore().tagItem({ itemId: "a1", name: "a.pdf", type: "file", labels: [] });
    await settle(AUTO_BACKUP_DEBOUNCE_MS);
    expect(backedUpItems(driveA)).toEqual(["a1"]);

    // B'nin jetonu geldi ama hesabı henüz okunmadı: açık depo hâlâ A.
    grant = { token: "tokenB", storeKey: null };
    engine.refresh();
    await getLabelStore().tagItem({ itemId: "a2", name: "a2.pdf", type: "file", labels: [] });
    await settle(AUTO_BACKUP_DEBOUNCE_MS);
    expect(driveB.state.calls).toEqual([]);

    // Hesap okundu: B'nin deposu açıldı. Boş depo, boş Drive: dosya oluşturulmaz.
    await activateAccountStore(B);
    grant = { token: "tokenB", storeKey: B };
    engine.refresh();
    await settle();
    expect(driveB.state.remote).toEqual([]);

    await getLabelStore().tagItem({ itemId: "b1", name: "b.pdf", type: "file", labels: [] });
    await settle(AUTO_BACKUP_DEBOUNCE_MS);
    expect(backedUpItems(driveB)).toEqual(["b1"]);
    expect(everyUpload(driveB).join("\n")).not.toMatch(/"a1"|"a2"/);

    // A'ya dönünce bekleyen a2 A'nın Drive'ına yazılır; B'nin etiketi oraya gitmez.
    await activateAccountStore(A);
    grant = { token: "tokenA", storeKey: A };
    engine.refresh();
    await settle();
    expect(backedUpItems(driveA)).toEqual(["a1", "a2"]);
    expect(backedUpItems(driveB)).toEqual(["b1"]);
    expect(Object.keys(await getAccountStore(A).listTaggedItems()).sort()).toEqual(["a1", "a2"]);
    expect(Object.keys(await getAccountStore(B).listTaggedItems())).toEqual(["b1"]);
  });

  it("B'ye geçince A'nın bekleyen değişiklik sayacı B'ye taşınmaz", async () => {
    // Sağlayıcı açık depo değişince motoru yeniler.
    await activateAccountStore(A);
    engine.refresh();
    await getLabelStore().tagItem({ itemId: "a1", name: "a.pdf", type: "file", labels: [] });
    await settle();
    expect(engine.getView().hasPendingChanges).toBe(true);

    await activateAccountStore(B);
    engine.refresh();
    expect(engine.getView().hasPendingChanges).toBe(false);

    await activateAccountStore(A);
    engine.refresh();
    expect(engine.getView().hasPendingChanges).toBe(true);
  });
});
