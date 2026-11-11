import { type DriveFile, isFolder, downloadDriveFile, listDriveFilesRecursive } from "./google-drive";
import { logger } from "../logger";

/** Reserves a path inside the archive, numbering it when the name is already in use. */
function reserveArchivePath(reserved: Set<string>, wanted: string): string {
  const dot = wanted.lastIndexOf(".");
  const [stem, suffix] = dot > 0 ? [wanted.slice(0, dot), wanted.slice(dot)] : [wanted, ""];

  let candidate = wanted;
  for (let copy = 1; reserved.has(candidate); copy++) {
    candidate = `${stem} (${copy})${suffix}`;
  }
  reserved.add(candidate);
  return candidate;
}

function saveToDisk({ blob, filename }: { blob: Blob; filename: string }): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: objectUrl, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

interface ArchiveEntry {
  file: DriveFile;
  /** How the entry is named in logs. */
  label: string;
  /** Path inside the archive. Unset for top-level files, which use the name the download returns. */
  folderPath?: string;
}

/** Flattens the selection, listing each folder only when the walk reaches it. */
async function* expandSelection(accessToken: string, selection: DriveFile[]): AsyncGenerator<ArchiveEntry> {
  for (const selected of selection) {
    if (!isFolder(selected)) {
      yield { file: selected, label: selected.name };
      continue;
    }
    const nested = await listDriveFilesRecursive(accessToken, selected.id, selected.name);
    for (const { file, path } of nested) {
      yield { file, label: path, folderPath: path };
    }
  }
}

/**
 * Packs the selection, folders included, into one archive and saves it. Files that
 * fail are skipped and counted; nothing is saved when every file failed.
 */
export async function downloadAsZip(
  accessToken: string,
  items: DriveFile[],
  zipName = "download.zip"
): Promise<{ success: boolean; failedCount: number; totalCount: number }> {
  // JSZip yalnız ZIP indirilirken yüklenir (dinamik import). Statik import, panel her
  // açıldığında ~100 KB'lık parçayı (jszip + pako + Next'in `util` polyfill'i) yüklüyor ve
  // polyfill içindeki `Function("return function*() {}")` (is-generator-function özellik
  // testi) CSP report-only'de 'unsafe-eval' ihlali raporluyordu (/dashboard/google-drive).
  const { default: JSZip } = await import("jszip");
  const archive = new JSZip();
  const reserved = new Set<string>();
  let failedCount = 0;
  let totalCount = 0;

  const addToArchive = ({ file, folderPath }: ArchiveEntry) =>
    downloadDriveFile(accessToken, file).then(({ blob, filename }) => {
      archive.file(reserveArchivePath(reserved, folderPath ?? filename), blob, { binary: true });
    });

  for await (const entry of expandSelection(accessToken, items)) {
    totalCount++;
    await addToArchive(entry).catch((err) => {
      logger.warn(`Could not download ${entry.label}:`, err);
      failedCount++;
    });
  }

  if (totalCount === failedCount) {
    return { success: false, failedCount, totalCount };
  }

  const stem = zipName.toLowerCase().endsWith(".zip") ? zipName.slice(0, -".zip".length) : zipName;
  saveToDisk({ blob: await archive.generateAsync({ type: "blob" }), filename: `${stem}.zip` });

  return { success: true, failedCount, totalCount };
}

/** Saves one Drive file under the name its download reports. */
export async function downloadSingleFile(accessToken: string, file: DriveFile): Promise<void> {
  saveToDisk(await downloadDriveFile(accessToken, file));
}
