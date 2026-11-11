/**
 * Drive yedeğinin otomatik işletimi. Tek bir işlem var: Drive'ı oku, yerele
 * birleştir, yedek farklıysa yaz (`syncDriveBackup`). Açılış, bağlanma, değişiklik
 * ve yeniden deneme hepsi bunu çalıştırır.
 *
 * Etiket verisi her zaman önce IndexedDB'ye yazılır; burada kaybolabilecek tek şey
 * "yedeklenmedi" bilgisidir. O yüzden bekleyen değişiklik localStorage'da sayaçla
 * tutulur: sayfa kapansa da kalır, sekmeler arasında paylaşılır. Bir sayaç kaybolsa
 * bile sonraki açılıştaki karşılaştırma farkı yakalar.
 *
 * Motor her an tek bir hesaba bağlıdır (`storeKey`): o hesabın deposunu dinler,
 * sayacını tutar ve yalnız o hesaba ait jetonla, o hesabın deposundan yazar.
 * Jeton başka hesabınsa hiçbir şey yazılmaz.
 */
import { isDriveAuthError } from "@/lib/google-drive/drive-connection-state";
import { backupStateKeyFor } from "./account-stores";
import { syncDriveBackup, type DriveSyncResult } from "./drive-backup";
import type { SyncableLabelStore } from "./label-store";
import { SnapshotError } from "./snapshot";

export const AUTO_BACKUP_DEBOUNCE_MS = 5_000;
/** Hiç durmadan değişiklik gelirse yedek sonsuza dek ertelenmesin. */
export const AUTO_BACKUP_MAX_WAIT_MS = 60_000;
export const AUTO_BACKUP_RETRY_BASE_MS = 30_000;
export const AUTO_BACKUP_RETRY_MAX_MS = 30 * 60_000;

/** Kısa kesintilerde bütün sekmeler aynı anda yeniden denemesin diye ±%20 sapma. */
const RETRY_JITTER = 0.2;
const LOCK_NAME = "folderpls-drive-backup";

export type AutoBackupPhase = "backed_up" | "pending" | "needs_connection" | "failed" | "paused";

export interface AutoBackupView {
  phase: AutoBackupPhase;
  lastBackupAt: number | null;
  hasPendingChanges: boolean;
  /** Son deneme başarısız oldu, geri çekilme sürüyor. */
  retrying: boolean;
}

interface PersistedBackupState {
  /** Her yerel değişiklikte artar. */
  revision: number;
  /** Drive'a yazıldığı doğrulanmış en son `revision`. */
  syncedRevision: number;
  lastBackupAt: number | null;
  /** Yerel veri silindi: yedek kendiliğinden geri gelmesin diye elle eşitlemeye kadar durur. */
  paused: boolean;
}

const INITIAL_STATE: PersistedBackupState = { revision: 0, syncedRevision: 0, lastBackupAt: null, paused: false };

function parseState(raw: string | null): PersistedBackupState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PersistedBackupState>;
    if (typeof value.revision !== "number" || typeof value.syncedRevision !== "number") return null;
    return {
      revision: value.revision,
      syncedRevision: value.syncedRevision,
      lastBackupAt: typeof value.lastBackupAt === "number" ? value.lastBackupAt : null,
      paused: value.paused === true,
    };
  } catch {
    return null;
  }
}

type BackupStorage = Pick<Storage, "getItem" | "setItem">;

export interface BackupBinding {
  /** Açık deponun hesabı; `null`: hiç hesap bağlanmamış eski depo (yedeklenmez). */
  storeKey: string | null;
  /** Yalnız `storeKey` hesabına ait geçerli jeton; başka hesabın jetonu asla verilmez. */
  token: string | null;
}

export interface DriveAutoBackupDeps {
  /** Hesabın somut deposu; motor bağlı olduğu hesabınkinden başkasını istemez. */
  getStore: (storeKey: string | null) => SyncableLabelStore;
  /** Şu anki hesap ve jetonu; pencere açmaz. */
  getBinding: () => BackupBinding;
  /** Drive 401 döndürdü. */
  onAuthError: () => void;
  /** Yalnız yeni dosya oluşturulurken çağrılır. */
  resolveParentId?: (token: string) => Promise<string | undefined>;
  sync?: typeof syncDriveBackup;
  /** Picker'da seçilmiş, yedekle aynı adlı dosyalar: eski yedek diye işaretlenmez. */
  getPickedFileIds?: () => string[];
  /** Varsayılan: sekmeler arası Web Locks. */
  withLock?: <T>(run: () => Promise<T>) => Promise<T>;
  /** Varsayılan: localStorage. */
  getStorage?: () => BackupStorage | null;
  isOnline?: () => boolean;
  random?: () => number;
}

function browserStorage(): BackupStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function withWebLock<T>(run: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  return locks ? (locks.request(LOCK_NAME, run) as Promise<T>) : run();
}

export class DriveAutoBackup {
  private readonly deps: DriveAutoBackupDeps;
  private readonly sync: typeof syncDriveBackup;
  private readonly withLock: <T>(run: () => Promise<T>) => Promise<T>;
  private readonly getStorage: () => BackupStorage | null;
  private readonly isOnline: () => boolean;
  private readonly random: () => number;

  private persisted: PersistedBackupState = INITIAL_STATE;
  private view: AutoBackupView = { phase: "needs_connection", lastBackupAt: null, hasPendingChanges: false, retrying: false };
  private readonly listeners = new Set<() => void>();

  private started = false;
  private unsubscribe: (() => void) | null = null;
  /** Bağlı olunan hesap; `undefined`: henüz başlamadı. */
  private storeKey: string | null | undefined = undefined;
  private token: string | null = null;
  /** Bu jetonla en az bir tur başarıyla bitti. */
  private confirmed = false;
  /** Yedek anlaşılamadı: kullanıcı eşitleyene ya da yeniden bağlanana kadar denenmez. */
  private blocked = false;
  private failures = 0;
  /** Tarayıcı çevrimdışı: `online` olayına kadar istek atılmaz. */
  private offline = false;
  private running: Promise<void> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private firstChangeAt: number | null = null;

  constructor(deps: DriveAutoBackupDeps) {
    this.deps = deps;
    this.sync = deps.sync ?? syncDriveBackup;
    this.withLock = deps.withLock ?? withWebLock;
    this.getStorage = deps.getStorage ?? browserStorage;
    this.isOnline = deps.isOnline ?? (() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
    this.random = deps.random ?? Math.random;
  }

  getView = (): AutoBackupView => this.view;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Dönen işlev durdurur. Yalnız tarayıcıda çağrılır. */
  start = (): (() => void) => {
    this.started = true;
    this.bindStore(this.deps.getBinding().storeKey);
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("storage", this.handleStorage);
    }
    this.publish();
    return this.stop;
  };

  private stop = (): void => {
    this.started = false;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.clearTimers();
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("storage", this.handleStorage);
    }
  };

  /** Hesap ya da jeton değişti. Yeni jetonla bir kez okunur, bekleyen varsa yazılır. */
  refresh = (): void => {
    if (!this.started) return;
    const binding = this.deps.getBinding();
    if (binding.storeKey !== this.storeKey) this.bindStore(binding.storeKey);
    this.setToken(binding.token);
  };

  /** Başka hesabın deposuna geçildi: önceki hesabın sayacı, zamanlayıcısı ve jetonu bırakılır. */
  private bindStore(storeKey: string | null): void {
    this.unsubscribe?.();
    this.storeKey = storeKey;
    this.token = null;
    this.confirmed = false;
    this.blocked = false;
    this.failures = 0;
    this.clearTimers();
    this.persisted = INITIAL_STATE;
    this.persisted = this.read();
    this.unsubscribe = this.deps.getStore(storeKey).subscribe((origin) => {
      if (origin === "local" && this.storeKey === storeKey) this.markChanged();
    });
    this.publish();
  }

  private stateKey(storeKey: string | null | undefined = this.storeKey): string {
    return backupStateKeyFor(storeKey ?? null);
  }

  private setToken(token: string | null): void {
    if (token === this.token) return;
    this.token = token;
    this.confirmed = false;
    this.blocked = false;
    this.failures = 0;
    this.clearTimers();
    if (token) this.runAuto();
    this.publish();
  };

  /** Eşitleme düğmesi: durdurulmuş ya da engellenmiş olsa da çalışır, hatayı çağırana verir. */
  syncNow = async (): Promise<DriveSyncResult | null> => {
    this.refresh();
    this.update((state) => ({ ...state, paused: false }));
    this.blocked = false;
    this.failures = 0;
    this.clearTimers();
    if (this.running) await this.running;
    return this.launch(true);
  };

  /** Yerel veri silinmeden önce: açık işi bekler, sonra hiçbir şey çalıştırmaz. */
  pause = async (): Promise<void> => {
    this.update((state) => ({ ...state, paused: true }));
    this.clearTimers();
    if (this.running) await this.running;
    this.publish();
  };

  resume = (): void => {
    this.update((state) => ({ ...state, paused: false }));
    this.runAuto();
    this.publish();
  };

  private read(): PersistedBackupState {
    try {
      return parseState(this.getStorage()?.getItem(this.stateKey()) ?? null) ?? this.persisted;
    } catch {
      return this.persisted;
    }
  }

  /** Tur bitmeden hesap değiştiyse sonuç o turun hesabına yazılır, açık hesabın durumuna değil. */
  private update(
    change: (state: PersistedBackupState) => PersistedBackupState,
    storeKey: string | null | undefined = this.storeKey
  ): void {
    const current = storeKey === this.storeKey;
    let base: PersistedBackupState;
    try {
      base = current ? this.read() : (parseState(this.getStorage()?.getItem(this.stateKey(storeKey)) ?? null) ?? INITIAL_STATE);
    } catch {
      base = current ? this.persisted : INITIAL_STATE;
    }
    const next = change(base);
    if (current) this.persisted = next;
    try {
      this.getStorage()?.setItem(this.stateKey(storeKey), JSON.stringify(next));
    } catch {
      // Depolama dolu ya da kapalı: bellekteki durumla devam edilir.
    }
    this.publish();
  }

  private hasPending(): boolean {
    return this.persisted.revision !== this.persisted.syncedRevision;
  }

  private canSync(): boolean {
    return this.started && !!this.token && !this.persisted.paused && !this.blocked;
  }

  private phase(): AutoBackupPhase {
    if (this.persisted.paused) return "paused";
    if (this.blocked) return "failed";
    if (!this.token) return "needs_connection";
    return this.running || this.hasPending() || !this.confirmed ? "pending" : "backed_up";
  }

  private publish(): void {
    const next: AutoBackupView = {
      phase: this.phase(),
      lastBackupAt: this.persisted.lastBackupAt,
      hasPendingChanges: this.hasPending(),
      retrying: this.failures > 0 || this.offline,
    };
    const unchanged = (Object.keys(next) as (keyof AutoBackupView)[]).every((key) => next[key] === this.view[key]);
    if (unchanged) return;
    this.view = next;
    this.listeners.forEach((listener) => listener());
  }

  private clearTimers(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.debounceTimer = null;
    this.retryTimer = null;
    this.firstChangeAt = null;
  }

  private markChanged(): void {
    this.update((state) => ({ ...state, revision: state.revision + 1 }));
    this.scheduleWrite();
  }

  /** Geri çekilme sürerken gelen değişiklik istek tetiklemez; bekleyen deneme onu da yazar. */
  private scheduleWrite(): void {
    if (!this.canSync() || this.retryTimer) return;
    const now = Date.now();
    this.firstChangeAt ??= now;
    const delay = Math.min(AUTO_BACKUP_DEBOUNCE_MS, Math.max(0, this.firstChangeAt + AUTO_BACKUP_MAX_WAIT_MS - now));
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.firstChangeAt = null;
      // Başka sekme bu arada yazmış olabilir.
      this.persisted = this.read();
      if (this.hasPending()) this.runAuto();
    }, delay);
  }

  private scheduleRetry(): void {
    const backoff = Math.min(AUTO_BACKUP_RETRY_MAX_MS, AUTO_BACKUP_RETRY_BASE_MS * 2 ** (this.failures - 1));
    const delay = backoff * (1 - RETRY_JITTER + 2 * RETRY_JITTER * this.random());
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.runAuto();
    }, delay);
  }

  /** Bir tur sürerken gelen değişiklik burada beklemez: tur bitince sayaç farkından yakalanır. */
  private runAuto(): void {
    if (!this.canSync() || this.running) return;
    this.offline = !this.isOnline();
    if (this.offline) {
      this.publish();
      return;
    }
    void this.launch(false).catch(() => undefined);
  }

  private launch(manual: boolean): Promise<DriveSyncResult | null> {
    const attempt = this.attempt(manual);
    this.running = attempt
      .catch(() => null)
      .then(() => {
        this.running = null;
        if (this.hasPending() || !this.confirmed) this.scheduleWrite();
        this.publish();
      });
    this.publish();
    return attempt;
  }

  private async attempt(manual: boolean): Promise<DriveSyncResult | null> {
    const storeKey = this.storeKey ?? null;
    const binding = this.deps.getBinding();
    // Jeton bu hesabın değilse (ya da hesap henüz okunmadıysa) yazılmaz.
    if (!storeKey || !binding.token || binding.storeKey !== storeKey) {
      this.token = null;
      return null;
    }
    const token = binding.token;
    this.token = token;
    // Dışa aktarmadan önce okunur: yazma sırasında gelen değişiklik "bekliyor" kalır.
    const revision = this.read().revision;
    try {
      const result = await this.withLock(() =>
        this.sync(token, this.deps.getStore(storeKey), {
          ownerKey: storeKey,
          parent: () => this.deps.resolveParentId?.(token) ?? Promise.resolve(undefined),
          onlyIfChanged: !manual,
          pickedFileIds: this.deps.getPickedFileIds?.() ?? [],
        })
      );
      if (this.storeKey === storeKey) {
        this.failures = 0;
        this.blocked = false;
        this.confirmed = true;
      }
      this.update(
        (state) => ({
          ...state,
          syncedRevision: Math.max(state.syncedRevision, revision),
          lastBackupAt: result.fileId ? Date.now() : state.lastBackupAt,
        }),
        storeKey
      );
      return result;
    } catch (err) {
      if (this.storeKey === storeKey) this.handleFailure(err, token);
      if (manual) throw err;
      return null;
    }
  }

  private handleFailure(err: unknown, token: string): void {
    if (isDriveAuthError(err)) {
      // Bu sırada yeniden bağlandıysa yeni jeton düşürülmez.
      if (this.deps.getBinding().token === token) this.deps.onAuthError();
      if (this.token === token) this.token = null;
      return;
    }
    if (err instanceof SnapshotError) {
      this.blocked = true;
      return;
    }
    this.failures += 1;
    this.scheduleRetry();
  }

  private handleOnline = (): void => {
    this.offline = false;
    if (this.confirmed && this.failures === 0 && !this.hasPending()) return this.publish();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.runAuto();
    this.publish();
  };

  /** Başka sekmedeki değişiklik: jeton bu sekmede olabilir. */
  private handleStorage = (event: StorageEvent): void => {
    if (event.key !== this.stateKey()) return;
    this.persisted = this.read();
    if (this.hasPending()) this.scheduleWrite();
    this.publish();
  };
}
