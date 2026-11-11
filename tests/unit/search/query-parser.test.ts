import { describe, expect, it } from "vitest";
import { chipText, extractInlineChips } from "@/lib/search/query-parser";
import { SAMPLE_LABELS, SAMPLE_PROPERTIES } from "./fixtures";

const ctx = { labels: SAMPLE_LABELS, properties: SAMPLE_PROPERTIES };

describe("extractInlineChips", () => {
  it("extracts a resolvable label shorthand into a chip and strips it from the text", () => {
    const { text, chips } = extractInlineChips("etiket:Fatura Ocak raporu", ctx);
    expect(text).toBe("Ocak raporu");
    expect(chips).toHaveLength(1);
    expect(chips[0]).toMatchObject({ kind: "label", labelId: "lbl_fatura" });
  });

  it("is Turkish-normalization aware when resolving label names", () => {
    const { chips } = extractInlineChips("etiket:sozlesme", ctx);
    expect(chips[0]).toMatchObject({ labelId: "lbl_sozlesme" });
  });

  it("leaves unresolvable shorthand as plain text instead of discarding it", () => {
    const { text, chips } = extractInlineChips("etiket:BilinmeyenEtiket", ctx);
    expect(chips).toHaveLength(0);
    expect(text).toBe("etiket:BilinmeyenEtiket");
  });

  it("parses a type shorthand", () => {
    const { chips, text } = extractInlineChips("tur:pdf sözleşme", ctx);
    expect(text).toBe("sözleşme");
    expect(chips[0]).toMatchObject({ kind: "type", fileType: "pdf" });
  });

  it("parses a date range shorthand", () => {
    const { chips } = extractInlineChips("tarih:2024-01-01..2024-02-01", ctx);
    expect(chips[0].kind).toBe("dateRange");
    expect(chips[0].dateFrom).toBe(Date.parse("2024-01-01"));
  });

  it("parses a property=value shorthand", () => {
    const { chips } = extractInlineChips("ozellik:Durum=Onaylandı", ctx);
    expect(chips[0]).toMatchObject({ kind: "property", propertyId: "prop_status", propertyValue: "Onaylandı" });
  });

  it("keeps quoted phrases intact as free text", () => {
    const { text } = extractInlineChips('"yıllık rapor" 2024', ctx);
    expect(text).toBe("yıllık rapor 2024");
  });

  it("passes through queries with no shorthand untouched", () => {
    const { text, chips } = extractInlineChips("basit arama metni", ctx);
    expect(text).toBe("basit arama metni");
    expect(chips).toHaveLength(0);
  });
});

describe("extractInlineChips — çip başlıkları", () => {
  it("arayüz dilindeki başlığı kullanır (İngilizce panelde 'Etiket:' sızmaz)", () => {
    const { chips } = extractInlineChips("label:Fatura", { ...ctx, prefixes: { label: "Label", type: "Type", date: "Date" } });
    expect(chips[0]).toMatchObject({ kind: "label", labelId: "lbl_fatura" });
    expect(chips[0].displayLabel).toBe(`Label: ${SAMPLE_LABELS.find((l) => l.id === "lbl_fatura")!.name}`);
  });

  it("İngilizce kalıp 'Label is Fatura' verir; Türkçe kalıp iki nokta kullanır", () => {
    const en = extractInlineChips("label:Fatura", { ...ctx, prefixes: { label: "Label", type: "Type", date: "Date", format: "{field} is {value}" } });
    expect(en.chips[0].displayLabel).toBe(`Label is ${SAMPLE_LABELS.find((l) => l.id === "lbl_fatura")!.name}`);
    expect(chipText("Etiket", "Acil", "{field}: {value}")).toBe("Etiket: Acil");
    // Değerdeki "$&" gibi özel dizgiler olduğu gibi kalır.
    expect(chipText("Label", "a$&b", "{field} is {value}")).toBe("Label is a$&b");
  });

  it("başlık verilmezse Türkçe varsayılan kalır", () => {
    const { chips } = extractInlineChips("tarih:2024-01-01", ctx);
    expect(chips[0].displayLabel).toBe("Tarih: 2024-01-01");
  });
});
