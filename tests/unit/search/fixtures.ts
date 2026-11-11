import type { DriveFile, LabelItem, PropertyDefinition, TaggedItem } from "@/lib/types";

const FOLDER_MIME = "application/vnd.google-apps.folder";

export function makeFile(overrides: Partial<DriveFile> & { id: string; name: string }): DriveFile {
  return {
    mimeType: "application/pdf",
    modifiedTime: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeFolder(overrides: Partial<DriveFile> & { id: string; name: string }): DriveFile {
  return makeFile({ ...overrides, mimeType: FOLDER_MIME });
}

export function makeTaggedItem(overrides: Partial<TaggedItem> & { itemId: string; name: string }): TaggedItem {
  return {
    type: "file",
    labels: [],
    properties: {},
    notes: [],
    addedAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

export const SAMPLE_LABELS: LabelItem[] = [
  { id: "lbl_fatura", name: "Fatura", color: "#ff0000" },
  { id: "lbl_sozlesme", name: "Sözleşme", color: "#00ff00" },
  { id: "lbl_final", name: "Final", color: "#0000ff" },
];

export const SAMPLE_PROPERTIES: PropertyDefinition[] = [
  {
    id: "prop_status",
    name: "Durum",
    type: "status",
    createdAt: new Date("2024-01-01"),
    options: [
      { id: "opt_draft", name: "Taslak", color: "#999" },
      { id: "opt_approved", name: "Onaylandı", color: "#0a0" },
    ],
  },
  {
    id: "prop_client",
    name: "Müşteri",
    type: "text",
    createdAt: new Date("2024-01-01"),
  },
];

/** A small, hand-authored dataset covering name/label/property/note matches. */
export function buildSampleDataset() {
  const files: DriveFile[] = [
    makeFile({ id: "f1", name: "Şirket Raporu 2024.pdf" }),
    makeFile({ id: "f2", name: "Fatura Ocak.pdf" }),
    makeFile({ id: "f3", name: "Sözleşme Taslağı.docx", mimeType: "application/vnd.google-apps.document" }),
    makeFile({ id: "f4", name: "Random Notes.txt", mimeType: "text/plain" }),
    makeFolder({ id: "d1", name: "Muhasebe" }),
  ];

  const taggedItems: TaggedItem[] = [
    makeTaggedItem({
      itemId: "f2",
      name: "Fatura Ocak.pdf",
      labels: ["lbl_fatura"],
      properties: { prop_status: "opt_approved", prop_client: "Acme A.Ş." },
    }),
    makeTaggedItem({
      itemId: "f3",
      name: "Sözleşme Taslağı.docx",
      type: "file",
      labels: ["lbl_sozlesme"],
      properties: { prop_status: "opt_draft" },
    }),
    makeTaggedItem({
      itemId: "f4",
      name: "Random Notes.txt",
      notes: [
        { id: "n1", type: "text", content: "Bu dosyada onaylandı bilgisi var ama etiket yok.", createdAt: new Date() },
      ],
    }),
  ];

  return { files, taggedItems, labels: SAMPLE_LABELS, properties: SAMPLE_PROPERTIES };
}

/** Generates a large synthetic dataset for performance benchmarking. */
export function buildSyntheticDataset(count: number) {
  const words = ["Rapor", "Fatura", "Sözleşme", "Sunum", "Bütçe", "Plan", "Görsel", "Not", "Taslak", "Onay"];
  const exts = ["pdf", "docx", "xlsx", "pptx", "txt"];
  const files: DriveFile[] = [];
  const taggedItems: TaggedItem[] = [];

  for (let i = 0; i < count; i++) {
    const word = words[i % words.length];
    const ext = exts[i % exts.length];
    const id = `file_${i}`;
    const isFolder = i % 37 === 0;
    files.push(
      isFolder
        ? makeFolder({ id, name: `${word} Klasörü ${i}` })
        : makeFile({ id, name: `${word} ${i}.${ext}`, mimeType: `application/${ext}` })
    );
    if (i % 3 === 0) {
      taggedItems.push(
        makeTaggedItem({
          itemId: id,
          name: `${word} ${i}`,
          labels: [SAMPLE_LABELS[i % SAMPLE_LABELS.length].id],
          properties: { prop_status: i % 2 === 0 ? "opt_approved" : "opt_draft" },
        })
      );
    }
  }

  return { files, taggedItems, labels: SAMPLE_LABELS, properties: SAMPLE_PROPERTIES };
}
