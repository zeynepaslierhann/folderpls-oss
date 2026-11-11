/**
 * Drive yedeği: kullanıcının Drive'ında görünen `folderpls-tags.json`.
 *
 * Yalnız `drive.file` ile çalışır. Yedek, adıyla değil uygulamanın kendi işaretiyle
 * bulunur: dosyanın `appProperties` alanında `folderplsBackup=1` ve hesabın depo
 * anahtarı (`folderplsOwner`) durur. `appProperties` yalnız aynı OAuth istemcisine
 * görünür; kullanıcının Picker'da seçtiği aynı adlı başka bir dosya ya da başka
 * hesabın paylaştığı yedek bu yüzden yedek sayılmaz. Başka bir kurulumdan (farklı
 * OAuth istemcisi) geçiş Dışa aktar / İçe aktar ile yapılır.
 *
 * `appDataFolder` bilinçli kullanılmadı: kullanıcıdan gizli olurdu.
 *
 * Drive v3'te koşullu yazma yok; iki cihaz aynı anda eşitlerse biri diğerinin
 * dosyasını ezebilir. Veri kaybolmaz: ezilen cihazın kopyası yerelde durur ve
 * bir sonraki eşitlemede yeniden birleşir.
 */
import { DRIVE_API_BASE, DRIVE_UPLOAD_URL, PICKED_BACKUP_NAMES_STORAGE_KEY } from "@/lib/constants";
import { uploadDriveFile } from "@/lib/google-drive/google-drive";
import { isValidDriveId } from "@/lib/google-drive/helpers";
import type { DriveFile } from "@/lib/types";
import { isStoreKey } from "./account-stores";
import type { SyncableLabelStore } from "./label-store";
import { hasMergeChanges, mergeSnapshots, type MergeStats } from "./merge";
import { MAX_SNAPSHOT_CHARS, parseSnapshot, serializeSnapshot, SnapshotError, type TagsSnapshot } from "./snapshot";

export const DRIVE_BACKUP_FILE_NAME = "folderpls-tags.json";
const BACKUP_MIME_TYPE = "application/json";

/** Uygulamanın yedek işareti (`appProperties`). Yalnız bu OAuth istemcisi okur ve yazar. */
export const BACKUP_MARK_PROPERTY = "folderplsBackup";
export const BACKUP_OWNER_PROPERTY = "folderplsOwner";
const BACKUP_MARK_VALUE = "1";
const BACKUP_FIELDS = "files(id,name,mimeType,modifiedTime,size,ownedByMe,parents,appProperties)";
const PICKED_LIMIT = 50;

export interface BackupFile {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
  ownedByMe?: boolean;
  parents?: string[];
  appProperties?: Record<string, string>;
}

function isNewer(a: Pick<DriveFile, "modifiedTime">, b: Pick<DriveFile, "modifiedTime">): number {
  return Date.parse(b.modifiedTime ?? "") - Date.parse(a.modifiedTime ?? "");
}

function assertOwnerKey(ownerKey: string): void {
  if (!isStoreKey(ownerKey)) throw new Error("Invalid backup owner key");
}

export function backupMark(ownerKey: string): Record<string, string> {
  return { [BACKUP_MARK_PROPERTY]: BACKUP_MARK_VALUE, [BACKUP_OWNER_PROPERTY]: ownerKey };
}

function isMarkedFor(file: BackupFile, ownerKey: string): boolean {
  const props = file.appProperties ?? {};
  return props[BACKUP_MARK_PROPERTY] === BACKUP_MARK_VALUE && props[BACKUP_OWNER_PROPERTY] === ownerKey;
}

async function queryFiles(accessToken: string, q: string): Promise<BackupFile[]> {
  const query = new URLSearchParams({ q, fields: BACKUP_FIELDS, pageSize: "10", spaces: "drive" });
  const res = await fetch(`${DRIVE_API_BASE}/files?${query}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Failed to list Drive backups (${res.status})`);
  const body = (await res.json()) as { files?: unknown };
  return Array.isArray(body.files) ? (body.files as BackupFile[]) : [];
}

const hasProperty = (key: string, value: string) => `appProperties has { key='${key}' and value='${value}' }`;

/** Bu hesabın işaretli yedekleri, en yeni önce. Yarış sonucu birden çok dosya olabilir. */
export async function findDriveBackups(accessToken: string, ownerKey: string): Promise<BackupFile[]> {
  assertOwnerKey(ownerKey);
  const q = `${hasProperty(BACKUP_MARK_PROPERTY, BACKUP_MARK_VALUE)} and ${hasProperty(BACKUP_OWNER_PROPERTY, ownerKey)} and trashed = false`;
  // Yanıt da denetlenir: işaretsiz dosya hiçbir yoldan yedek sayılmaz.
  return (await queryFiles(accessToken, q)).filter((file) => isMarkedFor(file, ownerKey)).sort(isNewer);
}

// --- İşaretsiz eski yedekler ---

/**
 * Picker'da seçilen, yedekle aynı adlı dosyaları hatırlar. Drive, dosyayı bu
 * uygulamanın mı oluşturduğunu yoksa kullanıcının mı seçtiğini söylemez; seçilenler
 * eski yedek diye işaretlenmesin diye ayrı tutulur.
 */
export function rememberPickedFiles(files: readonly Pick<DriveFile, "id" | "name">[]): void {
  const ids = files.filter((file) => file.name === DRIVE_BACKUP_FILE_NAME && isValidDriveId(file.id)).map((file) => file.id);
  if (ids.length === 0) return;
  try {
    const next = [...new Set([...readPickedFileIds(), ...ids])].slice(-PICKED_LIMIT);
    localStorage.setItem(PICKED_BACKUP_NAMES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Depolama kapalı: eski yedek işaretlemesi zaten konum ve sahiplik ister.
  }
}

export function readPickedFileIds(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(PICKED_BACKUP_NAMES_STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Bu uygulamanın işaretten önce yazdığı yedek: adı ve türü aynı, kullanıcıya ait,
 * uygulamanın yedeği koyduğu yerde (Drive kökü ya da FolderPls klasörü), Picker'da
 * seçilmemiş ve içi geçerli bir FolderPls yedeği. Hepsi gerekir.
 */
async function findLegacyBackups(
  accessToken: string,
  folderId: string | undefined,
  pickedFileIds: readonly string[]
): Promise<BackupFile[]> {
  const places = ["'root' in parents", ...(folderId && isValidDriveId(folderId) ? [`'${folderId}' in parents`] : [])];
  const q = `name = '${DRIVE_BACKUP_FILE_NAME}' and mimeType = '${BACKUP_MIME_TYPE}' and trashed = false and (${places.join(" or ")})`;
  const picked = new Set(pickedFileIds);
  return (await queryFiles(accessToken, q)).filter(
    (file) =>
      file.ownedByMe === true &&
      !picked.has(file.id) &&
      !file.appProperties?.[BACKUP_MARK_PROPERTY] &&
      !file.appProperties?.[BACKUP_OWNER_PROPERTY]
  );
}

async function markBackup(accessToken: string, fileId: string, ownerKey: string): Promise<void> {
  if (!isValidDriveId(fileId)) throw new Error("Invalid file ID format");
  const res = await fetch(`${DRIVE_API_BASE}/files/${fileId}?fields=id`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ appProperties: backupMark(ownerKey) }),
  });
  if (!res.ok) throw new Error(`Failed to mark Drive backup (${res.status})`);
}

/** Eski yedekleri okur; yalnız geçerli FolderPls yedeği olanları işaretler. */
async function adoptLegacyBackups(
  accessToken: string,
  ownerKey: string,
  candidates: BackupFile[]
): Promise<{ file: BackupFile; snapshot: TagsSnapshot }[]> {
  const adopted: { file: BackupFile; snapshot: TagsSnapshot }[] = [];
  for (const file of candidates) {
    let snapshot: TagsSnapshot;
    try {
      snapshot = await readDriveBackup(accessToken, file);
    } catch (err) {
      // FolderPls yedeği değil: başkasının aynı adlı dosyası, dokunulmaz.
      if (err instanceof SnapshotError && (err.code === "invalid_json" || err.code === "not_folderpls")) continue;
      throw err;
    }
    await markBackup(accessToken, file.id, ownerKey);
    adopted.push({ file, snapshot });
  }
  return adopted.sort((a, b) => isNewer(a.file, b.file));
}

/**
 * İndirme öncesi bayt sınırı. UTF-8 bayt sayısı metnin UTF-16 uzunluğundan küçük
 * olamaz: bu sınırın altındaki dosya `MAX_SNAPSHOT_CHARS`'ı da aşmaz.
 */
export const MAX_SNAPSHOT_BYTES = MAX_SNAPSHOT_CHARS;

/** Drive `size` alanını metin döner; yoksa (`undefined`) indirme sonrası uzunluk kontrolü kalır. */
function isTooLarge(size: string | undefined): boolean {
  if (size === undefined) return false;
  const bytes = Number(size);
  return !Number.isFinite(bytes) || bytes > MAX_SNAPSHOT_BYTES;
}

export async function readDriveBackup(accessToken: string, file: Pick<DriveFile, "id" | "size">): Promise<TagsSnapshot> {
  const fileId = file.id;
  if (!isValidDriveId(fileId)) throw new Error("Invalid file ID format");
  if (isTooLarge(file.size)) throw new SnapshotError("too_large");
  const res = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to read Drive backup (${res.status})`);
  const text = await res.text();
  if (text.length > MAX_SNAPSHOT_CHARS) throw new SnapshotError("too_large");
  return parseSnapshot(text).snapshot;
}

async function createDriveBackup(accessToken: string, snapshot: TagsSnapshot, ownerKey: string, parentId?: string): Promise<string> {
  const file = new File([serializeSnapshot(snapshot)], DRIVE_BACKUP_FILE_NAME, { type: BACKUP_MIME_TYPE });
  const created = await uploadDriveFile(accessToken, file, parentId, { appProperties: backupMark(ownerKey) });
  return created.id;
}

async function updateDriveBackup(accessToken: string, fileId: string, snapshot: TagsSnapshot): Promise<void> {
  if (!isValidDriveId(fileId)) throw new Error("Invalid file ID format");
  const res = await fetch(`${DRIVE_UPLOAD_URL}/files/${fileId}?uploadType=media`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": BACKUP_MIME_TYPE },
    body: serializeSnapshot(snapshot),
  });
  if (!res.ok) throw new Error(`Failed to update Drive backup (${res.status})`);
}

export interface DriveSyncResult {
  /** `onlyIfChanged` ile hem yedek hem veri yoksa `null`: boş dosya oluşturulmaz. */
  fileId: string | null;
  created: boolean;
  /** Drive'dan gelip yerel veriyi değiştiren kayıtlar (yedekler birleşik). */
  stats: MergeStats;
  localChanged: boolean;
  /** Bu turda işaretlenen eski (işaretsiz) yedek sayısı. */
  adoptedLegacy: number;
}

export interface DriveSyncOptions {
  /** Yedeğin ait olduğu hesap: depo anahtarı. Yalnız bu hesabın işaretli yedekleri okunur. */
  ownerKey: string;
  /** Yeni dosyanın klasörü (FolderPls klasörü); eski yedek ararken de bakılır. */
  parent?: string | (() => Promise<string | undefined>);
  /** Yedek zaten güncelse yazmaz; Drive kotası ve dosya sürümleri harcanmaz. */
  onlyIfChanged?: boolean;
  /** Picker'da seçilmiş aynı adlı dosyalar; eski yedek sayılmaz. */
  pickedFileIds?: readonly string[];
}

/** Yerel kayıtların alan sırası yedekten farklı olabilir: önce aynı doğrulamadan geçirilir. */
function isBackupCurrent(backup: TagsSnapshot, merged: TagsSnapshot): boolean {
  const normalized = parseSnapshot(serializeSnapshot(merged)).snapshot;
  return !hasMergeChanges(mergeSnapshots(backup, normalized).stats);
}

function isEmptySnapshot(snapshot: TagsSnapshot): boolean {
  return [snapshot.labels, snapshot.items, snapshot.propertyDefinitions, snapshot.collections, snapshot.tombstones].every(
    (records) => records.length === 0
  );
}

/**
 * Bu hesabın işaretli yedeklerini yerele birleştirir, sonucu en yeni dosyaya yazar.
 * İşaretli yedek yoksa uygulamanın işaretten önce yazdığı yedek bir kez işaretlenir.
 * Yedeklerden biri okunamazsa ya da uygulamadan yeni sürümdeyse hiçbir şey yazılmadan
 * hata verir: anlaşılmayan bir dosyanın üzerine yazmak veriyi yok ederdi.
 */
export async function syncDriveBackup(
  accessToken: string,
  store: SyncableLabelStore,
  { ownerKey, parent, onlyIfChanged = false, pickedFileIds = [] }: DriveSyncOptions
): Promise<DriveSyncResult> {
  assertOwnerKey(ownerKey);
  let parentId: Promise<string | undefined> | undefined;
  const resolveParent = () => (parentId ??= typeof parent === "function" ? parent() : Promise.resolve(parent));

  let backups = await findDriveBackups(accessToken, ownerKey);
  let remotes: TagsSnapshot[];
  let adoptedLegacy = 0;
  if (backups.length > 0) {
    remotes = await Promise.all(backups.map((file) => readDriveBackup(accessToken, file)));
  } else {
    const candidates = await findLegacyBackups(accessToken, await resolveParent(), pickedFileIds);
    const adopted = await adoptLegacyBackups(accessToken, ownerKey, candidates);
    backups = adopted.map(({ file }) => file);
    remotes = adopted.map(({ snapshot }) => snapshot);
    adoptedLegacy = adopted.length;
  }

  const stats: MergeStats = { added: 0, updated: 0, removed: 0, tombstones: 0 };
  for (const remote of remotes) {
    const applied = await store.importSnapshot(remote, { origin: "sync" });
    stats.added += applied.added;
    stats.updated += applied.updated;
    stats.removed += applied.removed;
    stats.tombstones += applied.tombstones;
  }

  const merged = await store.exportSnapshot();
  const localChanged = hasMergeChanges(stats);
  const [primary] = backups;
  if (primary) {
    if (!onlyIfChanged || !isBackupCurrent(remotes[0], merged)) await updateDriveBackup(accessToken, primary.id, merged);
    return { fileId: primary.id, created: false, stats, localChanged, adoptedLegacy };
  }
  if (onlyIfChanged && isEmptySnapshot(merged)) return { fileId: null, created: false, stats, localChanged, adoptedLegacy };
  const fileId = await createDriveBackup(accessToken, merged, ownerKey, await resolveParent());
  return { fileId, created: true, stats, localChanged, adoptedLegacy };
}
