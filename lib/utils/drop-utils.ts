export type DropFileEntry = {
  file: File;
  /** Bırakılan kökten itibaren yol; klasör bırakıldıysa alt klasörleri de içerir. */
  relativePath: string;
};

// Tarayıcı bir klasörü en çok 100'lük dilimler halinde verir.
const DIRECTORY_BATCH_SIZE = 100;

const readFileEntry = (entry: FileSystemFileEntry) =>
  new Promise<File>((resolve, reject) => entry.file(resolve, reject));

const readNextBatch = (reader: FileSystemDirectoryReader) =>
  new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));

const isFileEntry = (entry: FileSystemEntry): entry is FileSystemFileEntry => entry.isFile;

const isDirectoryEntry = (entry: FileSystemEntry): entry is FileSystemDirectoryEntry => entry.isDirectory;

async function collectEntry(entry: FileSystemEntry, parentPath: string, into: DropFileEntry[]): Promise<void> {
  if (isFileEntry(entry)) {
    const file = await readFileEntry(entry);
    into.push({ file, relativePath: parentPath + file.name });
    return;
  }
  if (!isDirectoryEntry(entry)) return;

  const ownPath = `${parentPath}${entry.name}/`;
  const reader = entry.createReader();
  let batch: FileSystemEntry[];
  do {
    batch = await readNextBatch(reader);
    for (const child of batch) {
      await collectEntry(child, ownPath, into);
    }
  } while (batch.length === DIRECTORY_BATCH_SIZE);
}

/** Sürükle-bırak verisindeki dosyaları, klasör yapısını yollarda koruyarak düz listeye çevirir. */
export async function getFilesFromDrop(dataTransfer: DataTransfer): Promise<DropFileEntry[]> {
  const topLevelFiles = () => Array.from(dataTransfer.files, (file) => ({ file, relativePath: file.name }));

  const { items } = dataTransfer;
  if (!items) return topLevelFiles();

  const collected: DropFileEntry[] = [];
  let position = 0;
  while (position < items.length) {
    const item = items[position++];
    const dropped = item.kind === "file" ? (item.webkitGetAsEntry?.() ?? item.getAsFile()) : null;

    if (dropped instanceof File) {
      collected.push({ file: dropped, relativePath: dropped.name });
    } else if (dropped) {
      await collectEntry(dropped, "", collected);
    }
  }

  return collected.length > 0 ? collected : topLevelFiles();
}
