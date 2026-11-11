import { describe, it, expect } from "vitest";
import { sortFiles, nextSort } from "@/lib/ui/sort-files";

const F = "application/vnd.google-apps.folder";
const files = [
  { name: "b.pdf", mimeType: "application/pdf", modifiedTime: "2026-09-27T10:00:00Z", size: "4600000" },
  { name: "Zeta", mimeType: F, modifiedTime: "2026-10-04T10:00:00Z" },
  { name: "a.txt", mimeType: "text/plain", modifiedTime: "2026-09-24T10:00:00Z", size: "2300" },
  { name: "Alpha", mimeType: F, modifiedTime: "2026-10-01T10:00:00Z" },
];

describe("sortFiles", () => {
  it("null sıralama Drive sırasını aynen korur", () => {
    expect(sortFiles(files, null)).toBe(files);
  });
  it("ada göre: klasörler önce, sonra artan", () => {
    expect(sortFiles(files, { key: "name", dir: "asc" }).map((f) => f.name)).toEqual(["Alpha", "Zeta", "a.txt", "b.pdf"]);
  });
  it("tarihe göre azalan", () => {
    expect(sortFiles(files, { key: "modified", dir: "desc" }).map((f) => f.name)).toEqual(["Zeta", "Alpha", "b.pdf", "a.txt"]);
  });
  it("boyuta göre azalan; boyutsuz öğeler sonda", () => {
    expect(sortFiles(files, { key: "size", dir: "desc" }).map((f) => f.name)).toEqual(["Alpha", "Zeta", "b.pdf", "a.txt"]);
  });
  it("girdiyi değiştirmez", () => {
    const copy = [...files];
    sortFiles(files, { key: "name", dir: "desc" });
    expect(files).toEqual(copy);
  });
});

describe("nextSort", () => {
  it("ilk tık: ad artan, tarih/boyut azalan", () => {
    expect(nextSort(null, "name")).toEqual({ key: "name", dir: "asc" });
    expect(nextSort(null, "modified")).toEqual({ key: "modified", dir: "desc" });
  });
  it("ikinci tık yönü çevirir, üçüncü varsayılana döner", () => {
    const s1 = nextSort(null, "size");
    const s2 = nextSort(s1, "size");
    expect(s2).toEqual({ key: "size", dir: "asc" });
    expect(nextSort(s2, "size")).toBeNull();
  });
});
