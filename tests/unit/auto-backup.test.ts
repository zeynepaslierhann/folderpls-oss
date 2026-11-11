import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTO_BACKUP_DEBOUNCE_MS,
  AUTO_BACKUP_MAX_WAIT_MS,
  AUTO_BACKUP_RETRY_BASE_MS,
  AUTO_BACKUP_RETRY_MAX_MS,
  DriveAutoBackup,
  type DriveAutoBackupDeps,
} from "@/lib/storage/auto-backup";
import { syncDriveBackup, type DriveSyncResult } from "@/lib/storage/drive-backup";
import { IndexedDbLabelStore } from "@/lib/storage/indexeddb-label-store";
import { SnapshotError } from "@/lib/storage/snapshot";
import type { LabelStoreChangeOrigin, SyncableLabelStore } from "@/lib/storage/label-store";
import { createFakeDrive } from "./helpers/fake-drive";

const OK: DriveSyncResult = {
  fileId: "backup",
  created: false,
  stats: { added: 0, updated: 0, removed: 0, tombstones: 0 },
  localChanged: false,
  adoptedLegacy: 0,
};

const OWNER = "a".repeat(32);

function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value) };
}

/** Yalnız değişiklik olayını sağlayan depo; motorun zamanlamasını sınar. */
function fakeStore() {
  const listeners = new Set<(origin: LabelStoreChangeOrigin) => void>();
  const store = {
    subscribe: (listener: (origin: LabelStoreChangeOrigin) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  } as unknown as SyncableLabelStore;
  return { store, emit: (origin: LabelStoreChangeOrigin = "local") => listeners.forEach((l) => l(origin)) };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup(overrides: Partial<DriveAutoBackupDeps> = {}) {
  const { store, emit } = fakeStore();
  const session = { token: null as string | null, storeKey: OWNER as string | null };
  const sync = vi.fn(async (): Promise<DriveSyncResult> => OK);
  const onAuthError = vi.fn(() => {
    session.token = null;
  });
  const storage = memoryStorage();
  const engine = new DriveAutoBackup({
    getStore: () => store,
    getBinding: () => ({ storeKey: session.storeKey, token: session.token }),
    onAuthError,
    sync: sync as unknown as DriveAutoBackupDeps["sync"],
    withLock: (run) => run(),
    getStorage: () => storage,
    random: () => 0.5, // Sapma sıfır: bekleme süreleri tam değer.
    ...overrides,
  });
  const stop = engine.start();
  const connect = async (token = "t1") => {
    session.token = token;
    engine.refresh();
    await vi.advanceTimersByTimeAsync(0);
  };
  const dropToken = () => {
    session.token = null;
    engine.refresh();
  };
  return { engine, emit, session, sync, onAuthError, storage, connect, dropToken, stop };
}

const after = (ms: number) => vi.advanceTimersByTimeAsync(ms);

describe("otomatik Drive yedeği", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe("debounce", () => {
    it("art arda değişiklikleri tek yazmada birleştirir", async () => {
      const { emit, sync, connect } = setup();
      await connect();
      sync.mockClear();

      for (let i = 0; i < 5; i++) {
        emit();
        await after(1_000);
      }
      expect(sync).not.toHaveBeenCalled();

      await after(AUTO_BACKUP_DEBOUNCE_MS);
      expect(sync).toHaveBeenCalledTimes(1);
      await after(60_000);
      expect(sync).toHaveBeenCalledTimes(1);
    });

    it("hiç durmayan değişiklikte en geç üst sınırda yazar", async () => {
      const { emit, sync, connect } = setup();
      await connect();
      sync.mockClear();

      for (let elapsed = 0; elapsed < AUTO_BACKUP_MAX_WAIT_MS + 2_000; elapsed += 2_000) {
        emit();
        await after(2_000);
      }
      expect(sync).toHaveBeenCalledTimes(1);
    });

    it("Drive'dan gelen veriyi yeniden yedeklemez", async () => {
      const { emit, sync, connect } = setup();
      await connect();
      sync.mockClear();

      emit("sync");
      await after(AUTO_BACKUP_DEBOUNCE_MS * 2);
      expect(sync).not.toHaveBeenCalled();
    });
  });

  describe("eşzamanlı yazma kilidi", () => {
    it("yazma sürerken ikinci yazma başlamaz, gelen değişiklik sonra yazılır", async () => {
      const { emit, sync, connect, engine } = setup();
      await connect();
      sync.mockClear();
      const first = deferred<DriveSyncResult>();
      sync.mockImplementationOnce(() => first.promise);

      emit();
      await after(AUTO_BACKUP_DEBOUNCE_MS);
      expect(sync).toHaveBeenCalledTimes(1);

      emit();
      await after(AUTO_BACKUP_DEBOUNCE_MS * 3);
      expect(sync).toHaveBeenCalledTimes(1);
      expect(engine.getView()).toMatchObject({ phase: "pending", hasPendingChanges: true });

      first.resolve(OK);
      await after(0);
      expect(engine.getView().hasPendingChanges).toBe(true);
      await after(AUTO_BACKUP_DEBOUNCE_MS);
      expect(sync).toHaveBeenCalledTimes(2);
      expect(engine.getView()).toMatchObject({ phase: "backed_up", hasPendingChanges: false });
    });

    it("elle eşitleme açık yazmanın bitmesini bekler", async () => {
      const { emit, sync, connect, engine } = setup();
      await connect();
      sync.mockClear();
      const first = deferred<DriveSyncResult>();
      sync.mockImplementationOnce(() => first.promise);

      emit();
      await after(AUTO_BACKUP_DEBOUNCE_MS);
      const manual = engine.syncNow();
      await after(0);
      expect(sync).toHaveBeenCalledTimes(1);

      first.resolve(OK);
      await manual;
      expect(sync).toHaveBeenCalledTimes(2);
    });

    it("yazmayı sekmeler arası kilidin içinde çalıştırır", async () => {
      const order: string[] = [];
      const { connect, sync } = setup({
        withLock: async (run) => {
          order.push("kilit");
          const result = await run();
          order.push("bırak");
          return result;
        },
      });
      sync.mockImplementation(async () => {
        order.push("yaz");
        return OK;
      });
      await connect();
      expect(order).toEqual(["kilit", "yaz", "bırak"]);
    });

    it("açılışta otomatik tur yalnız farklıysa yazar, elle eşitleme her zaman yazar", async () => {
      const { sync, connect, engine } = setup();
      await connect();
      expect(sync.mock.calls.at(-1)).toMatchObject({ 2: { onlyIfChanged: true, ownerKey: OWNER } });
      await engine.syncNow();
      expect(sync.mock.calls.at(-1)).toMatchObject({ 2: { onlyIfChanged: false, ownerKey: OWNER } });
    });
  });

  describe("token yokken", () => {
    it("Drive çağırmaz, değişikliği bekletir, bağlantı gerekli der", async () => {
      const { emit, sync, engine } = setup();
      emit();
      await after(AUTO_BACKUP_DEBOUNCE_MS * 10);
      expect(sync).not.toHaveBeenCalled();
      expect(engine.getView()).toMatchObject({ phase: "needs_connection", hasPendingChanges: true });
    });

    it("bekleyen değişiklik sayfa kapanıp açılınca durur", async () => {
      const storage = memoryStorage();
      const first = setup({ getStorage: () => storage });
      first.emit();
      first.stop();

      const reopened = setup({ getStorage: () => storage });
      expect(reopened.engine.getView()).toMatchObject({ phase: "needs_connection", hasPendingChanges: true });
      await reopened.connect();
      expect(reopened.sync).toHaveBeenCalledTimes(1);
      expect(reopened.engine.getView()).toMatchObject({ phase: "backed_up", hasPendingChanges: false });
    });

    it("jeton yazma sırasında düşerse (401) durur, yeniden denemez", async () => {
      const { emit, sync, connect, engine, onAuthError } = setup();
      await connect();
      sync.mockClear();
      sync.mockRejectedValueOnce(Object.assign(new Error("Failed"), { code: 401 }));

      emit();
      await after(AUTO_BACKUP_DEBOUNCE_MS);
      expect(onAuthError).toHaveBeenCalledTimes(1);
      expect(engine.getView()).toMatchObject({ phase: "needs_connection", hasPendingChanges: true });

      await after(AUTO_BACKUP_RETRY_MAX_MS * 2);
      expect(sync).toHaveBeenCalledTimes(1);
    });
  });

  describe("Reconnect", () => {
    it("yeniden bağlanınca bekleyen değişiklik tek turda yazılır", async () => {
      const { emit, sync, connect, dropToken, engine } = setup();
      await connect("eski");
      sync.mockClear();

      dropToken();
      emit();
      emit();
      await after(AUTO_BACKUP_DEBOUNCE_MS * 2);
      expect(sync).not.toHaveBeenCalled();

      await connect("yeni");
      expect(sync).toHaveBeenCalledTimes(1);
      expect(sync.mock.calls[0]).toMatchObject({ 0: "yeni" });
      expect(engine.getView()).toMatchObject({ phase: "backed_up", hasPendingChanges: false });
      await after(AUTO_BACKUP_DEBOUNCE_MS * 2);
      expect(sync).toHaveBeenCalledTimes(1);
    });

    it("son yedek zamanı kalıcıdır", async () => {
      const storage = memoryStorage();
      const first = setup({ getStorage: () => storage });
      await first.connect();
      const at = first.engine.getView().lastBackupAt;
      expect(at).toBe(Date.now());
      first.stop();

      expect(setup({ getStorage: () => storage }).engine.getView()).toMatchObject({ lastBackupAt: at, phase: "needs_connection" });
    });
  });

  describe("hata geri çekilmesi", () => {
    const networkError = () => new TypeError("Failed to fetch");

    it("ağ hatasında artan aralıkla, üst sınıra kadar dener", async () => {
      const { sync, connect, engine } = setup();
      sync.mockRejectedValue(networkError());
      await connect();
      expect(sync).toHaveBeenCalledTimes(1);
      expect(engine.getView()).toMatchObject({ phase: "pending", retrying: true });

      await after(AUTO_BACKUP_RETRY_BASE_MS - 1);
      expect(sync).toHaveBeenCalledTimes(1);
      await after(1);
      expect(sync).toHaveBeenCalledTimes(2);

      await after(AUTO_BACKUP_RETRY_BASE_MS * 2 - 1);
      expect(sync).toHaveBeenCalledTimes(2);
      await after(1);
      expect(sync).toHaveBeenCalledTimes(3);

      await after(AUTO_BACKUP_RETRY_MAX_MS * 3);
      const calls = sync.mock.calls.length;
      await after(AUTO_BACKUP_RETRY_MAX_MS);
      expect(sync.mock.calls.length).toBe(calls + 1);
    });

    it("geri çekilme sırasında yeni değişiklik istek tetiklemez", async () => {
      const { emit, sync, connect } = setup();
      sync.mockRejectedValue(networkError());
      await connect();

      for (let i = 0; i < 10; i++) {
        emit();
        await after(1_000);
      }
      expect(sync).toHaveBeenCalledTimes(1);
    });

    it("sonraki başarıda bekleyen yazılır ve sayaç sıfırlanır", async () => {
      const { emit, sync, connect, engine } = setup();
      sync.mockRejectedValueOnce(networkError());
      await connect();
      emit();

      await after(AUTO_BACKUP_RETRY_BASE_MS);
      expect(sync).toHaveBeenCalledTimes(2);
      expect(engine.getView()).toMatchObject({ phase: "backed_up", hasPendingChanges: false, retrying: false });
    });

    it("okunamayan yedekte yazmayı durdurur, döngüye girmez", async () => {
      const { emit, sync, connect, engine } = setup();
      sync.mockRejectedValue(new SnapshotError("unsupported_version"));
      await connect();
      expect(engine.getView().phase).toBe("failed");

      emit();
      await after(AUTO_BACKUP_RETRY_MAX_MS * 2);
      expect(sync).toHaveBeenCalledTimes(1);
    });

    it("çevrimdışıyken istek atmaz, bağlantı gelince bir kez dener", async () => {
      let online = false;
      const listeners = new Map<string, () => void>();
      vi.stubGlobal("window", {
        addEventListener: (name: string, fn: () => void) => listeners.set(name, fn),
        removeEventListener: () => undefined,
      });
      const { sync, connect, engine } = setup({ isOnline: () => online });
      await connect();
      expect(sync).not.toHaveBeenCalled();
      expect(engine.getView()).toMatchObject({ phase: "pending", retrying: true });

      online = true;
      listeners.get("online")?.();
      await after(0);
      expect(sync).toHaveBeenCalledTimes(1);
    });
  });

  describe("yerel veri silinince", () => {
    it("elle eşitlenene kadar Drive'dan geri getirmez", async () => {
      const storage = memoryStorage();
      const first = setup({ getStorage: () => storage });
      await first.engine.pause();
      first.stop();

      const reopened = setup({ getStorage: () => storage });
      await reopened.connect();
      expect(reopened.sync).not.toHaveBeenCalled();
      expect(reopened.engine.getView().phase).toBe("paused");

      await reopened.engine.syncNow();
      expect(reopened.sync).toHaveBeenCalledTimes(1);
      expect(reopened.engine.getView().phase).toBe("backed_up");
    });
  });

  /** Gerçek depo ve birleştirme, Drive REST'in bellek karşılığıyla. Gerçek hesapla doğrulama değildir. */
  describe("iki cihaz", () => {
    const drive = createFakeDrive();
    let counter = 0;
    const newStore = () => new IndexedDbLabelStore(`auto-${Date.now()}-${++counter}`);

    /** İçerik yazımları: yeni dosya ya da mevcut dosyanın içeriği (işaret yazımı sayılmaz). */
    const contentWrites = () =>
      drive.state.calls
        .filter((c) => c.method !== "GET" && c.url.includes("/upload/"))
        .map((c) => (c.method === "POST" ? "create" : "update"));

    function device(store: SyncableLabelStore, storeKey: string = OWNER) {
      const binding = { storeKey, token: null as string | null };
      const engine = new DriveAutoBackup({
        getStore: () => store,
        getBinding: () => binding,
        onAuthError: () => undefined,
        sync: syncDriveBackup,
        withLock: (run) => run(),
        getStorage: () => memoryStorage(),
      });
      engine.start();
      return Object.assign(engine, {
        connect(token: string | null) {
          binding.token = token;
          engine.refresh();
        },
      });
    }

    /** Sahte zamanlayıcıyla birlikte gerçek IndexedDB (setImmediate) işlemleri de bitsin. */
    async function settle(ms = 0) {
      await vi.advanceTimersByTimeAsync(ms);
      for (let i = 0; i < 30; i++) await new Promise((resolve) => setImmediate(resolve));
    }

    beforeEach(() => {
      drive.reset();
      vi.stubGlobal("fetch", drive.fetch);
    });

    it("iki cihazın etiketleri otomatik turda birleşir", async () => {
      const storeA = newStore();
      const storeB = newStore();
      await storeA.tagItem({ itemId: "fA", name: "a.pdf", type: "file", labels: ["fromA"] });
      await storeB.tagItem({ itemId: "fB", name: "b.pdf", type: "file", labels: ["fromB"] });

      const a = device(storeA);
      a.connect("token");
      await settle();
      expect(contentWrites()).toEqual(["create"]);

      const b = device(storeB);
      b.connect("token");
      await settle();
      expect(contentWrites()).toEqual(["create", "update"]);
      expect(Object.keys(await storeB.listTaggedItems()).sort()).toEqual(["fA", "fB"]);

      // A'nın ikinci açılışı: B'nin etiketi gelir, yedek zaten güncel olduğu için yazılmaz.
      const reopened = device(storeA);
      reopened.connect("token");
      await settle();
      expect(Object.keys(await storeA.listTaggedItems()).sort()).toEqual(["fA", "fB"]);
      expect(contentWrites()).toEqual(["create", "update"]);
    });

    it("gerçek depoda değişiklik debounce sonrası yedeğe yazılır, değişmeyen veri yazılmaz", async () => {
      const store = newStore();
      await store.tagItem({ itemId: "f1", name: "a.pdf", type: "file", labels: [] });
      const engine = device(store);
      engine.connect("token");
      await settle();
      expect(contentWrites()).toEqual(["create"]);

      await store.tagItem({ itemId: "f2", name: "b.pdf", type: "file", labels: [] });
      await settle(AUTO_BACKUP_DEBOUNCE_MS);
      expect(contentWrites()).toEqual(["create", "update"]);
      expect(JSON.parse(drive.state.remote[0].content).items).toHaveLength(2);

      engine.connect(null);
      engine.connect("token");
      await settle();
      expect(contentWrites()).toEqual(["create", "update"]);
    });

    it("yerelde de Drive'da da veri yoksa dosya oluşturmaz", async () => {
      device(newStore()).connect("token");
      await settle();
      expect(contentWrites()).toEqual([]);
    });

    it("birleştirme sonrası ekran yenilensin diye 'sync' olayı yayar", async () => {
      const storeA = newStore();
      await storeA.tagItem({ itemId: "fA", name: "a.pdf", type: "file", labels: [] });
      device(storeA).connect("token");
      await settle();

      const storeB = newStore();
      const origins: LabelStoreChangeOrigin[] = [];
      storeB.subscribe((origin) => origins.push(origin));
      device(storeB).connect("token");
      await settle();
      expect(origins).toEqual(["sync"]);
    });
  });
});
