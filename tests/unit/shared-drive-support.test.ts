import { afterEach, describe, expect, it, vi } from "vitest";
import { getDriveFile, copyDriveFile, renameDriveFile, moveDriveFile } from "@/lib/google-drive/api/file-operations";
import { trashDriveFile, restoreDriveFile, deleteDriveFile } from "@/lib/google-drive/api/trash-operations";
import { createDriveFolder } from "@/lib/google-drive/api/folder-operations";
import { listDriveFiles, listSharedWithMeFiles, listTrashedDriveFiles } from "@/lib/google-drive/api/list-operations";
import { enableDrivesOnView } from "@/lib/google-drive/drive-picker";

const urls: string[] = [];
function mockFetch() {
  urls.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      urls.push(String(url));
      return { ok: true, status: 200, json: async () => ({ files: [], id: "x" }), blob: async () => new Blob() };
    })
  );
}
afterEach(() => vi.unstubAllGlobals());

describe("Drive API calls address shared drives", () => {
  it("every files call carries supportsAllDrives=true", async () => {
    mockFetch();
    const t = "tok";
    await getDriveFile(t, "abc");
    await copyDriveFile(t, "abc", "n");
    await renameDriveFile(t, "abc", "n");
    await moveDriveFile(t, "abc", "def", "ghi");
    await trashDriveFile(t, "abc");
    await restoreDriveFile(t, "abc");
    await deleteDriveFile(t, "abc");
    await createDriveFolder(t, "n", "def");
    await listDriveFiles(t, { folderId: "root" });
    await listSharedWithMeFiles(t);
    await listTrashedDriveFiles(t);
    expect(urls.length).toBe(11);
    for (const u of urls) expect(u).toContain("supportsAllDrives=true");
  });

  it("list calls also include items from all drives", async () => {
    mockFetch();
    await listDriveFiles("t", { folderId: "root" });
    await listSharedWithMeFiles("t");
    await listTrashedDriveFiles("t");
    for (const u of urls) expect(u).toContain("includeItemsFromAllDrives=true");
  });

  it("picker views opt in to shared drives when supported", () => {
    const setEnableDrives = vi.fn();
    enableDrivesOnView({ setEnableDrives });
    expect(setEnableDrives).toHaveBeenCalledWith(true);
    expect(() => enableDrivesOnView({})).not.toThrow();
  });
});
