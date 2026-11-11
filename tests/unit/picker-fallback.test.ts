import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
const PAGE = "app/(dashboard)/dashboard/google-drive/page.tsx";

describe("Yedek akış: panelde 'Pick files to organize' birincil eylem", () => {
  const page = read(PAGE);

  it("Picker kancası çoklu seçim + klasörlere inme + klasör seçimi kapalı ayarla bağlı", () => {
    const hook = read("components/dashboard/google-picker.tsx");
    expect(hook).toMatch(/multiSelect: true/);
    expect(hook).toMatch(/includeFolders: true/);
    expect(hook).toMatch(/selectFolderEnabled: false/);
    expect(page).toContain("useGooglePicker(accessToken");
  });

  it("boş durum seçmeden ÖNCE klasörün topluca alınamadığını söyler (TR + EN)", () => {
    const i18n = read("lib/i18n/i18n.ts");
    expect(i18n).toContain("bir klasörü topluca içeri alamaz");
    expect(i18n).toContain("can't import a whole folder at once");
  });

  it("üst çubukta, boş durumda ve onboarding'de aynı dosya seçici açılır", () => {
    expect(page.match(/filePicker\.open\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(page).toContain('t("dashboard.panel.pickFilesToOrganize")');
    expect(page).toMatch(/onPickFiles=\{\(\) => \{[\s\S]*?filePicker\.open\(\)/);
  });

  it("seçilen dosyalar listeye eklenir, seçili yapılır ve ilk kez ise etiket penceresi açılır", () => {
    const fn = page.slice(page.indexOf("const handlePickerSelect"), page.indexOf("const filePicker"));
    expect(fn).toContain("setDriveFiles(");
    expect(fn).toContain("setSelectedIds(");
    expect(fn).toContain("setLabelDialogFile(");
    expect(fn).toContain("Object.keys(taggedItems).length === 0");
  });
});

describe("Klasör seçimi listelenemezse sessiz kalınmaz", () => {
  const page = read(PAGE);
  const fn = page.slice(page.indexOf("const handlePickFolder"), page.indexOf("const handlePickerSelect"));

  it("boş sonuç ve izin hatası, listeyi değiştirmeden açık mesaja gider", () => {
    expect(fn).toContain("setFolderNotListedName(folder.name)");
    expect(fn.match(/setFolderNotListedName\(folder\.name\);\s*return;/g)?.length).toBe(2);
    // liste yalnız dosya bulunduktan sonra değişir
    expect(fn.indexOf("setDriveFiles(allFiles)")).toBeGreaterThan(fn.lastIndexOf("setFolderNotListedName(folder.name)"));
    expect(fn).toMatch(/!allFiles\.some\(\(f\) => !isFolder\(f\)\)/);
  });

  it("mesajın yanında 'Pick files instead' eylemi var", () => {
    expect(page).toContain('t("dashboard.folderNotListed")');
    expect(page).toContain('t("dashboard.panel.pickFilesInstead")');
  });
});

describe("Görünür metinler dosya seçimini ana vaat olarak sunar", () => {
  const i18n = read("lib/i18n/i18n.ts");
  it("onboarding 1. adım ve bağlan metni klasör vaadi taşımaz", () => {
    expect(i18n).toContain('onboardingStep1Title: "Pick the files to organize"');
    expect(i18n).toContain("Düzenlenecek dosyaları seçin");
    expect(i18n).not.toMatch(/Connect your Drive folder|Pick an existing Drive folder|Drive klasörünüzü bağlayın|works inside one Drive folder/);
    expect(i18n).toContain("FolderPls only sees the files you pick in Google's picker.");
  });
});
