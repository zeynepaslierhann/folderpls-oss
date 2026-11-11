// Panelin gösterdiği çalışma klasörünü Drive kökünde arar, gerekirse boş bir adla yenisini açar.

import { listDriveFiles, createDriveFolder, type DriveFile } from "./google-drive";

const WORKSPACE_FOLDER = "FolderPls";
const ALTERNATE_FOLDER = "FolderPls New";
const NUMBERED_ALTERNATE = /^FolderPls New(\d+)$/;

const FOLDERS_IN_ROOT = {
  folderId: "root",
  mimeType: "application/vnd.google-apps.folder",
} as const;

/** Kökteki çalışma klasörü; yoksa `null`. Çöpe atılmış klasörler aramaya girmez. */
export async function findFolderPlsInRoot(accessToken: string): Promise<DriveFile | null> {
  const { files } = await listDriveFiles(accessToken, {
    ...FOLDERS_IN_ROOT,
    pageSize: 10,
    nameEquals: WORKSPACE_FOLDER,
  });
  return files.length > 0 ? files[0] : null;
}

/** Önce sade adlar denenir, ikisi de doluysa en yüksek numaranın bir fazlası alınır. */
function chooseFreeName(existing: Set<string>): string {
  for (const plain of [WORKSPACE_FOLDER, ALTERNATE_FOLDER]) {
    if (!existing.has(plain)) return plain;
  }

  let highest = 0;
  for (const name of existing) {
    const numbered = NUMBERED_ALTERNATE.exec(name);
    if (numbered) highest = Math.max(highest, Number(numbered[1]));
  }
  return `${ALTERNATE_FOLDER}${highest + 1}`;
}

export async function createNewFolderPlsFolder(accessToken: string): Promise<DriveFile> {
  const { files } = await listDriveFiles(accessToken, { ...FOLDERS_IN_ROOT, pageSize: 100 });
  const name = chooseFreeName(new Set(files.map((folder) => folder.name)));
  return createDriveFolder(accessToken, name, "root");
}
