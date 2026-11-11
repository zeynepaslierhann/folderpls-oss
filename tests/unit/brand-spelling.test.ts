import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Ürün adı yazımı: uygulama adının baş harfleri
 * HER ZAMAN büyük yazılır — "FolderPls".
 * "folderpls", "Folderpls", "Folder Pls", "FOLDERPLS" kullanıcıya görünen metinde YANLIŞTIR.
 *
 * Kapsam: kullanıcıya GÖRÜNEN metin (i18n sözlüğü, JSX metni, görünür JSX öznitelikleri,
 * string/şablon değişmezleri, blog/yasal içerik, manifest). DEĞİŞMEZ olanlar: alan adları
 * (folderpls.com, www.folderpls.com), e-posta adresleri, URL yolları/slug'lar, depolama
 * anahtarları, dosya/paket adları, kod tanımlayıcıları — bunlar "teknik jeton" sayılır.
 * Yorum satırları AST'de zaten yok sayılır.
 */

const ROOT = path.resolve(__dirname, "../..");
const SOURCE_DIRS = ["app", "components", "lib"];

interface Brand {
  canonical: string;
  /** Tüm yazım varyantlarını (harf boyutu, boşluk, tire) yakalar. */
  pattern: RegExp;
}

const BRANDS: Brand[] = [
  { canonical: "FolderPls", pattern: /folder[\s_-]?pls/gi },
];

const TECHNICAL_BEFORE = /[A-Za-z0-9_@/.-]/;
const TECHNICAL_AFTER = /^(?:[A-Za-z0-9_@/-]|\.[A-Za-z])/;

interface Violation {
  found: string;
  expected: string;
  context: string;
}

/**
 * Bir metin parçasındaki yanlış yazılmış ürün adlarını döndürür.
 * Bitişik karakterlerinden "teknik jeton" (alan adı, e-posta, yol, anahtar, tanımlayıcı)
 * olduğu anlaşılanlar yok sayılır.
 */
function findBrandViolations(text: string): Violation[] {
  const out: Violation[] = [];
  for (const { canonical, pattern } of BRANDS) {
    for (const m of text.matchAll(pattern)) {
      if (m[0] === canonical) continue;
      const start = m.index ?? 0;
      const before = start > 0 ? text[start - 1] : "";
      const after = text.slice(start + m[0].length);
      if (before && TECHNICAL_BEFORE.test(before)) continue;
      if (after && TECHNICAL_AFTER.test(after)) continue;
      out.push({
        found: m[0],
        expected: canonical,
        context: text.slice(Math.max(0, start - 20), start + m[0].length + 20).replace(/\s+/g, " "),
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------- kaynak taraması

/** Değeri kod anahtarı olan nesne alanları: tam "folderpls" değişmezi burada görünür metin değildir. */
const CODE_KEY_PROPS = new Set(["id", "edge", "side", "slug", "key", "href", "src"]);
/** Görünür metin taşıyan JSX öznitelikleri; diğerleri (className, href, side…) yok sayılır. */
const VISIBLE_JSX_ATTRS = new Set([
  "alt",
  "title",
  "aria-label",
  "aria-description",
  "aria-valuetext",
  "placeholder",
  "content",
  "label",
  "description",
  "summary",
  "text",
  "tooltip",
]);
const CASE_TRANSFORM_CLASS = /(?:^|\s)(?:uppercase|lowercase)(?:\s|$)/;

function isCodeOnlyLiteral(node: ts.Node): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return true;
  if (ts.isLiteralTypeNode(parent) || ts.isImportTypeNode(parent) || ts.isExternalModuleReference(parent)) return true;
  if (ts.isCallExpression(parent)) {
    const callee = parent.expression;
    if (callee.kind === ts.SyntaxKind.ImportKeyword) return true;
    if (ts.isIdentifier(callee) && callee.text === "require") return true;
  }
  if (ts.isJsxAttribute(parent)) return !VISIBLE_JSX_ATTRS.has(parent.name.getText());
  if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
    const name = ts.isIdentifier(parent.name) || ts.isStringLiteral(parent.name) ? parent.name.text : "";
    return CODE_KEY_PROPS.has(name);
  }
  return false;
}

function jsxClassName(opening: ts.JsxOpeningElement): string {
  for (const attr of opening.attributes.properties) {
    if (ts.isJsxAttribute(attr) && attr.name.getText() === "className" && attr.initializer && ts.isStringLiteral(attr.initializer)) {
      return attr.initializer.text;
    }
  }
  return "";
}

/** Bir kaynak dosyadaki görünür-metin adaylarını (metin + konum) çıkarır. */
function visibleTextCandidates(file: string, source: string): { text: string; line: number; note?: string }[] {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const found: { text: string; line: number; note?: string }[] = [];
  const lineOf = (node: ts.Node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      found.push({ text: node.text, line: lineOf(node) });
    } else if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      if (!isCodeOnlyLiteral(node)) found.push({ text: node.text, line: lineOf(node) });
    } else if (ts.isJsxElement(node) && CASE_TRANSFORM_CLASS.test(jsxClassName(node.openingElement))) {
      // CSS uppercase/lowercase görünen yazımı bozar: "FolderPls" -> "FOLDERPLS".
      for (const child of node.children) {
        if (!ts.isJsxText(child)) continue;
        for (const { canonical, pattern } of BRANDS) {
          if (new RegExp(pattern.source, "i").test(child.text)) {
            found.push({
              text: child.text.replace(new RegExp(pattern.source, "gi"), "\u0000"),
              line: lineOf(child),
              note: `${canonical} bir uppercase/lowercase sınıfı içinde; CSS yazımı bozar`,
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

function walk(dir: string, filter: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === "node_modules" ? [] : walk(full, filter);
    return filter.test(name) ? [full] : [];
  });
}

function jsonStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(jsonStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(jsonStrings);
  return [];
}

describe("findBrandViolations (yazım denetçisinin kendisi)", () => {
  it("yanlış yazımları yakalar", () => {
    const wrong = [
      "folderpls works inside one Drive folder",
      "Güvenlik nedeniyle folderpls yalnız",
      "Revokes folderpls's Drive access",
      "folderpls'in Drive erişimi",
      "Folderpls",
      "FOLDERPLS",
      "FolderPLS",
      "Folder Pls",
      "Use folderpls.",
    ];
    for (const text of wrong) expect(findBrandViolations(text), text).not.toEqual([]);
  });

  it("doğru yazımı ve teknik jetonları (alan adı, e-posta, yol, anahtar) kabul eder", () => {
    const ok = [
      "FolderPls works inside one Drive folder",
      "FolderPls'in (folderpls.com) veri sorumlusu",
      "Please use folderpls.com.",
      "support@folderpls.com",
      "https://www.folderpls.com/pricing",
      "GET foo.folderpls.com/auth 400",
      "folderpls_drive_token",
      "folderpls-export-abc.json",
      "application/folderpls-files",
      "folderpls.recentSearches.",
      "folderpls-vs-google-drive-labels",
      "./folder-pls-operations",
    ];
    for (const text of ok) expect(findBrandViolations(text), text).toEqual([]);
  });
});

describe("ürün adı yazımı (FolderPls)", () => {
  it("kaynaktaki görünür metinlerde (JSX, string, şablon) yanlış yazım yok", () => {
    const problems: string[] = [];
    for (const dir of SOURCE_DIRS) {
      for (const file of walk(path.join(ROOT, dir), /\.tsx?$/)) {
        const source = readFileSync(file, "utf8");
        // Hızlı ön eleme: ürün adı hiç geçmeyen dosyaları AST'ye sokma.
        if (!BRANDS.some((b) => new RegExp(b.pattern.source, "i").test(source))) continue;
        for (const c of visibleTextCandidates(file, source)) {
          const violations = c.note ? [{ found: "", expected: "", context: c.note }] : findBrandViolations(c.text);
          for (const v of violations) {
            const where = `${path.relative(ROOT, file)}:${c.line}`;
            problems.push(
              v.found ? `${where}  "${v.found}" -> "${v.expected}"  (…${v.context}…)` : `${where}  ${v.context}`,
            );
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("public/manifest.json içindeki görünür alanlarda yanlış yazım yok", () => {
    const manifest = JSON.parse(readFileSync(path.join(ROOT, "public/manifest.json"), "utf8"));
    const problems = jsonStrings(manifest).flatMap((s) => findBrandViolations(s));
    expect(problems).toEqual([]);
    expect(manifest.short_name).toBe("FolderPls");
    expect(manifest.name.startsWith("FolderPls")).toBe(true);
  });

  it("çalışma zamanı sözlüğünde (i18n TR+EN) yanlış yazım yok", async () => {
    const { translations } = await import("@/lib/i18n/i18n");
    const problems = jsonStrings(translations).flatMap((s) => findBrandViolations(s));
    expect(problems).toEqual([]);
  });
});
