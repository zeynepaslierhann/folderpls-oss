import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DRIVE_SCOPES, getDriveScopes } from "@/lib/google-drive/constants";
import {
  BACKUP_MARK_PROPERTY,
  BACKUP_OWNER_PROPERTY,
  backupMark,
  DRIVE_BACKUP_FILE_NAME,
  MAX_SNAPSHOT_BYTES,
  syncDriveBackup,
  type DriveSyncOptions,
} from "@/lib/storage/drive-backup";
import { IndexedDbLabelStore } from "@/lib/storage/indexeddb-label-store";
import { buildSnapshot, serializeSnapshot, SNAPSHOT_SCHEMA_VERSION } from "@/lib/storage/snapshot";
import { createFakeDrive, remoteFile, type RemoteFile } from "./helpers/fake-drive";

const OWNER = "a".repeat(32);
const OTHER = "b".repeat(32);

const drive = createFakeDrive();
let counter = 0;
const newStore = () => new IndexedDbLabelStore(`drive-${++counter}`);
const sync = (store: IndexedDbLabelStore, options: Partial<DriveSyncOptions> = {}) =>
  syncDriveBackup("token", store, { ownerKey: OWNER, ...options });
const marked = (file: RemoteFile, owner = OWNER): RemoteFile => ({ ...file, appProperties: backupMark(owner) });
const emptySnapshot = () =>
  serializeSnapshot(buildSnapshot({ labels: [], items: [], propertyDefinitions: [], collections: [], tombstones: [] }));

async function snapshotWith(itemId: string): Promise<string> {
  const donor = newStore();
  await donor.tagItem({ itemId, name: `${itemId}.pdf`, type: "file", labels: [] });
  return serializeSnapshot(await donor.exportSnapshot());
}

const remote = () => drive.state.remote;
const writes = () => drive.writes();
const legacyQueries = () => drive.state.calls.filter((c) => c.method === "GET" && c.url.includes("name+%3D"));

describe("Drive yedeği", () => {
  beforeEach(() => {
    drive.reset();
    vi.stubGlobal("fetch", drive.fetch);
  });

  it("yedek yoksa görünür klasöre işaretli folderpls-tags.json oluşturur", async () => {
    const store = newStore();
    await store.tagItem({ itemId: "f1", name: "a.pdf", type: "file", labels: ["l1"] });

    const result = await sync(store, { parent: "folderplsFolder" });

    expect(result.created).toBe(true);
    expect(remote()).toHaveLength(1);
    expect(remote()[0]).toMatchObject({
      name: DRIVE_BACKUP_FILE_NAME,
      parents: ["folderplsFolder"],
      appProperties: { [BACKUP_MARK_PROPERTY]: "1", [BACKUP_OWNER_PROPERTY]: OWNER },
    });
    expect(JSON.parse(remote()[0].content)).toMatchObject({ schemaVersion: SNAPSHOT_SCHEMA_VERSION, items: [{ itemId: "f1" }] });
  });

  it("başka cihaz yedeği işaretiyle bulur, birleştirir, aynı dosyaya yazar", async () => {
    const a = newStore();
    await a.tagItem({ itemId: "f1", name: "a.pdf", type: "file", labels: ["fromA"] });
    await sync(a);

    const b = newStore();
    await b.tagItem({ itemId: "f2", name: "b.pdf", type: "file", labels: ["fromB"] });
    const result = await sync(b);

    expect(result).toMatchObject({ created: false, localChanged: true, adoptedLegacy: 0 });
    expect(remote()).toHaveLength(1);
    expect(Object.keys(await b.listTaggedItems()).sort()).toEqual(["f1", "f2"]);

    await sync(a);
    expect(Object.keys(await a.listTaggedItems()).sort()).toEqual(["f1", "f2"]);
  });

  it("silme cihazlar arasında yedek üzerinden yayılır", async () => {
    const a = newStore();
    await a.tagItem({ itemId: "f1", name: "a.pdf", type: "file", labels: [] });
    await sync(a);
    const b = newStore();
    await sync(b);

    await a.deleteItem("f1");
    await sync(a);
    await sync(b);

    expect(await b.listTaggedItems()).toEqual({});
  });

  it("iki işaretli dosyayı birleştirir, en yenisine yazar, diğerine dokunmaz", async () => {
    const older = await snapshotWith("f1");
    const newer = await snapshotWith("f2");
    drive.state.remote = [
      marked(remoteFile("old", older, { modifiedTime: "2026-01-01T00:00:00Z" })),
      marked(remoteFile("recent", newer, { modifiedTime: "2026-02-01T00:00:00Z" })),
    ];

    const store = newStore();
    const result = await sync(store);

    expect(result.fileId).toBe("recent");
    expect(Object.keys(await store.listTaggedItems()).sort()).toEqual(["f1", "f2"]);
    expect(remote().find((f) => f.id === "old")?.content).toBe(older);
    expect(writes()).toHaveLength(1);
  });

  it.each([
    ["yeni şema", JSON.stringify({ schemaVersion: 99, app: "folderpls-tags" })],
    ["bozuk dosya", "{bozuk"],
  ])("işaretli %s: hiçbir şey yazmadan durur", async (_name, content) => {
    drive.state.remote = [marked(remoteFile("x", content))];
    const store = newStore();
    await store.tagItem({ itemId: "f1", name: "a.pdf", type: "file", labels: [] });

    await expect(sync(store)).rejects.toThrow();

    expect(writes()).toEqual([]);
    expect(remote()[0].content).toBe(content);
  });

  it("sınırı aşan yedek indirilmeden reddedilir, hiçbir şey yazılmaz", async () => {
    drive.state.remote = [marked({ ...remoteFile("big", emptySnapshot()), size: String(MAX_SNAPSHOT_BYTES + 1) })];

    await expect(sync(newStore())).rejects.toMatchObject({ code: "too_large" });

    expect(drive.state.calls.some((c) => c.url.includes("alt=media"))).toBe(false);
    expect(writes()).toEqual([]);
  });

  it("sınırın altındaki boyut ve boyutsuz yanıt indirilir", async () => {
    const content = emptySnapshot();
    drive.state.remote = [marked({ ...remoteFile("ok", content), size: String(content.length) })];
    await sync(newStore());
    drive.state.remote = [marked(remoteFile("nosize", content))];
    await sync(newStore());
    expect(drive.state.calls.filter((c) => c.url.includes("alt=media"))).toHaveLength(2);
  });

  it("yalnız drive.file kapsamı istenir, appDataFolder kullanılmaz", async () => {
    await sync(newStore());
    expect(getDriveScopes()).toBe(DRIVE_SCOPES.FILE_ONLY);
    expect(drive.state.calls.every((c) => !c.url.includes("appDataFolder"))).toBe(true);
  });

  it("geçersiz hesap anahtarıyla Drive'a hiç istek atmaz", async () => {
    await expect(syncDriveBackup("token", newStore(), { ownerKey: "kisi@example.com" })).rejects.toThrow();
    expect(drive.state.calls).toEqual([]);
  });
});

describe("yedek işareti", () => {
  beforeEach(() => {
    drive.reset();
    vi.stubGlobal("fetch", drive.fetch);
  });

  it("başka bir yerdeki işaretsiz aynı adlı yabancı dosya yedek sayılmaz, dokunulmaz", async () => {
    const foreign = remoteFile("foreign", await snapshotWith("theirs"), { parents: ["someFolder"] });
    drive.state.remote = [foreign];
    const store = newStore();
    await store.tagItem({ itemId: "mine", name: "m.pdf", type: "file", labels: [] });

    const result = await sync(store);

    expect(result).toMatchObject({ created: true, adoptedLegacy: 0 });
    expect(Object.keys(await store.listTaggedItems())).toEqual(["mine"]);
    expect(remote().find((f) => f.id === "foreign")).toEqual(foreign);
  });

  it("Picker'da seçilmiş aynı adlı dosya kökte olsa da işaretlenmez, okunmaz", async () => {
    const picked = remoteFile("picked", await snapshotWith("theirs"));
    drive.state.remote = [picked];
    const store = newStore();

    const result = await sync(store, { pickedFileIds: ["picked"] });

    expect(result.adoptedLegacy).toBe(0);
    expect(await store.listTaggedItems()).toEqual({});
    expect(remote().find((f) => f.id === "picked")?.appProperties).toBeUndefined();
    expect(drive.state.calls.some((c) => c.url.includes("/files/picked?alt=media"))).toBe(false);
  });

  it("kullanıcıya ait olmayan (paylaşılan) aynı adlı dosya işaretlenmez", async () => {
    drive.state.remote = [remoteFile("shared", await snapshotWith("theirs"), { ownedByMe: false })];
    const result = await sync(newStore());
    expect(result.adoptedLegacy).toBe(0);
    expect(remote().find((f) => f.id === "shared")?.appProperties).toBeUndefined();
  });

  it("FolderPls yedeği olmayan aynı adlı dosya işaretlenmez, yazmayı durdurmaz", async () => {
    drive.state.remote = [remoteFile("notes", JSON.stringify({ hello: "world" }))];
    const store = newStore();
    await store.tagItem({ itemId: "mine", name: "m.pdf", type: "file", labels: [] });

    const result = await sync(store);

    expect(result).toMatchObject({ created: true, adoptedLegacy: 0 });
    const notes = remote().find((f) => f.id === "notes");
    expect(notes?.content).toBe(JSON.stringify({ hello: "world" }));
    expect(notes?.appProperties).toBeUndefined();
  });

  it("başka hesabın işaretli yedeği okunmaz", async () => {
    drive.state.remote = [marked(remoteFile("otherAccount", await snapshotWith("theirs")), OTHER)];
    const store = newStore();

    await sync(store);

    expect(await store.listTaggedItems()).toEqual({});
    expect(drive.state.calls.some((c) => c.url.includes("/files/otherAccount?alt=media"))).toBe(false);
  });

  it("uygulamanın işaretten önce yazdığı yedek bir kez işaretlenir ve birleştirilir", async () => {
    drive.state.remote = [remoteFile("legacy", await snapshotWith("old"))];
    const store = newStore();

    const first = await sync(store);

    expect(first).toMatchObject({ fileId: "legacy", created: false, adoptedLegacy: 1 });
    expect(remote()).toHaveLength(1);
    expect(remote()[0].appProperties).toEqual(backupMark(OWNER));
    expect(Object.keys(await store.listTaggedItems())).toEqual(["old"]);

    const queriesBefore = legacyQueries().length;
    const second = await sync(store);
    expect(second.adoptedLegacy).toBe(0);
    expect(legacyQueries().length).toBe(queriesBefore);
  });

  it("FolderPls klasöründeki eski yedek de bulunur", async () => {
    drive.state.remote = [remoteFile("inFolder", await snapshotWith("old"), { parents: ["folderplsFolder"] })];
    const store = newStore();

    const result = await sync(store, { parent: async () => "folderplsFolder" });

    expect(result).toMatchObject({ fileId: "inFolder", adoptedLegacy: 1 });
    expect(remote()[0].appProperties).toEqual(backupMark(OWNER));
  });

  it("işaretli yedek varken eski işaretsiz dosyalara bakılmaz", async () => {
    drive.state.remote = [marked(remoteFile("current", emptySnapshot())), remoteFile("legacy", await snapshotWith("old"))];
    await sync(newStore());
    expect(legacyQueries()).toEqual([]);
    expect(remote().find((f) => f.id === "legacy")?.appProperties).toBeUndefined();
  });
});
