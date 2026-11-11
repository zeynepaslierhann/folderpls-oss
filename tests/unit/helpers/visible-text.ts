import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * Kaynak dosyalardaki KULLANICIYA GÖRÜNEN metin adaylarını (JSX metni, string ve şablon
 * değişmezleri, görünür JSX öznitelikleri) AST'den çıkarır. Yorum satırları AST'de yoktur,
 * bu yüzden doğal olarak yok sayılır. İçe aktarma yolları, kod anahtarı olan nesne alanları
 * (id/slug/href/src…) ve görünür olmayan JSX öznitelikleri (className, href…) atlanır.
 *
 * Kullananlar: tests/unit/claim-scan.test.ts (kanıtsız iddia taraması).
 */

export interface VisibleText {
  text: string;
  line: number;
}

/** Değeri kod anahtarı olan nesne alanları: bu değişmezler görünür metin değildir. */
const CODE_KEY_PROPS = new Set(["id", "edge", "side", "slug", "key", "href", "src"]);

/** Görünür metin taşıyan JSX öznitelikleri; diğerleri (className, href…) yok sayılır. */
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

/** Bir kaynak dosyadaki görünür-metin adaylarını (metin + satır) çıkarır. */
export function visibleTexts(file: string, source: string): VisibleText[] {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const found: VisibleText[] = [];
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
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** `dir` altındaki, `filter`e uyan dosyaların tam yolları (node_modules hariç). */
export function walk(dir: string, filter: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === "node_modules" ? [] : walk(full, filter);
    return filter.test(name) ? [full] : [];
  });
}
