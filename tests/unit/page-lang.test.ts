import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ENGLISH_CONTENT_PATHS,
  TR_PATH_FIRST_PAINT_SCRIPT,
  documentLang,
  isEnglishContentPath,
  isTurkishContentPath,
} from "@/lib/i18n/page-lang";
import { LEGAL_PATHS } from "@/lib/legal/types";

describe("<html lang> (WCAG 3.1.1)", () => {
  it("/tr yolları arayüz dilinden bağımsız Türkçe sayılır", () => {
    for (const p of [LEGAL_PATHS.privacy.tr, LEGAL_PATHS.terms.tr, "/tr", "/tr/herhangi"]) {
      expect(isTurkishContentPath(p), p).toBe(true);
      expect(documentLang(p, "en"), p).toBe("tr");
      expect(documentLang(p, "tr"), p).toBe("tr");
    }
  });

  it("diğer yollarda arayüz dili korunur; /tr ile başlayan başka yollar Türkçe sayılmaz", () => {
    for (const p of ["/", "/pricing", "/trial", "/translate", "/dashboard/google-drive", "/signup"]) {
      expect(isTurkishContentPath(p), p).toBe(false);
      expect(isEnglishContentPath(p), p).toBe(false);
      expect(documentLang(p, "en"), p).toBe("en");
      expect(documentLang(p, "tr"), p).toBe("tr");
    }
    expect(documentLang(null, "en")).toBe("en");
    expect(documentLang(undefined, "tr")).toBe("tr");
  });

  it("yalnız İngilizce içerikli sayfalar arayüz Türkçe iken de lang=en kalır (doğrulayıcı bulgusu)", () => {
    // Önce: TR arayüzde /features, /integrations, /privacy-policy ... <html lang="tr"> alıyor, içerik İngilizce.
    for (const p of [
      "/features",
      "/integrations",
      "/about",
      "/changelog",
      "/contact",
      "/blog",
      "/blog/folderpls-vs-google-drive-labels",
      "/drive-labels-checker",
      LEGAL_PATHS.privacy.en,
      LEGAL_PATHS.terms.en,
    ]) {
      expect(isEnglishContentPath(p), p).toBe(true);
      expect(documentLang(p, "tr"), p).toBe("en");
      expect(documentLang(p, "en"), p).toBe("en");
    }
    // ön ek tuzağı: "/features-x" ya da "/blogger" İngilizce içerik yolu sayılmaz
    for (const p of ["/features-x", "/blogger", "/about-us", "/privacy-policy-tr"]) {
      expect(isEnglishContentPath(p), p).toBe(false);
    }
  });

  it("/tr içerik yolu İngilizce listesinden önce gelir", () => {
    expect(documentLang(LEGAL_PATHS.privacy.tr, "en")).toBe("tr");
    expect(isEnglishContentPath(LEGAL_PATHS.privacy.tr)).toBe(false);
  });

  it("her pazarlama sayfası sınıflandırılmış: İngilizce-yalnız listede ya da arayüz dilini izleyen (bilinçli) listede", () => {
    // Yeni bir sayfa eklenince bu test onu sınıflandırmaya zorlar. Arayüz dilini izleyenler: içerik
    // bileşeni locale okuyor (pricing -> components/landing/pricing).
    const FOLLOWS_UI_LOCALE = new Set(["pricing"]);
    const dir = path.resolve(__dirname, "../../app/(marketing)");
    const pages = readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== "tr")
      .map((e) => e.name);
    const english = new Set(ENGLISH_CONTENT_PATHS.map((p) => p.slice(1)));
    for (const name of pages) {
      expect(english.has(name) || FOLLOWS_UI_LOCALE.has(name), `app/(marketing)/${name} sınıflandırılmamış`).toBe(true);
    }
    for (const name of english) expect(pages, `listede olup sayfası olmayan: ${name}`).toContain(name);
  });

  it("İngilizce-yalnız sayfaların kendi kaynağı arayüz dilini okumaz (liste yalan söylemesin)", () => {
    const dir = path.resolve(__dirname, "../../app/(marketing)");
    for (const p of ENGLISH_CONTENT_PATHS) {
      const file = path.join(dir, p.slice(1), "page.tsx");
      const source = readFileSync(file, "utf8");
      expect(source, p).not.toMatch(/useI18n|locale\s*===|isTr\b/);
    }
  });

  it("ilk boyama betiği aynı kuralı uygular (yol örnekleri üzerinden çalıştırılır)", () => {
    const run = (pathname: string) => {
      const doc = { documentElement: { lang: "en" } };
      new Function("location", "document", TR_PATH_FIRST_PAINT_SCRIPT)({ pathname }, doc);
      return doc.documentElement.lang;
    };
    for (const p of ["/tr/gizlilik-politikasi", "/tr/kullanim-sartlari", "/tr", "/tr/"]) expect(run(p), p).toBe("tr");
    for (const p of ["/", "/pricing", "/privacy-policy", "/trial", "/translate"]) expect(run(p), p).toBe("en");
  });
});
