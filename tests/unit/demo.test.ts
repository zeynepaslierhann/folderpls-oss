import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { DemoWorkspace, DemoWorkspaceView } from "@/components/demo/demo-workspace";
import { SITE_URL } from "@/lib/constants/site";
import { isValidLabelColor } from "@/lib/constants/colors";
import {
  MAX_DEMO_LABELS,
  MAX_TAG_NAME_LENGTH,
  addTag,
  availableTags,
  createInitialState,
  createTag,
  labelsOf,
  normalizeTagName,
  removeTag,
  searchDemo,
  tagCounts,
  toggleFilter,
  type DemoState,
} from "@/lib/demo/demo-model";
import { DEMO_FILES, DEMO_LABELS } from "@/lib/demo/sample-data";
import { ENGLISH_CONTENT_PATHS } from "@/lib/i18n/page-lang";
import { FixedLocaleProvider, useI18n } from "@/lib/i18n/i18n-context";
import type { Locale } from "@/lib/i18n/i18n";
import { PAGE_META, renderedTitle } from "@/lib/seo/page-meta";
import { formatDate, formatDateTime } from "@/lib/utils/date";

/**
 * /demo: oturumsuz, örnek veriyle deneme. Güvenlik sözü testle kilitli: ağ, depolama,
 * kimlik, Drive yok; veri uydurma; müşteri adı yok; davranış gerçek arama motoruyla.
 */

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const names = (state: DemoState, ids: string[]) => ids.map((id) => state.files.find((f) => f.id === id)!.name);
const fileNames = (files: { name: string }[]) => files.map((f) => f.name).sort();
/** children özelliği yerine alt eleman olarak geçirir (react/no-children-prop). */
const withLocale = (locale: Locale, node: ReactNode) =>
  createElement(FixedLocaleProvider as unknown as ComponentType<{ locale: Locale }>, { locale }, node);

describe("örnek veri", () => {
  it("12 dosya, 8 etiket; kimlikler tekil; her başlangıç etiketi tanımlı; renkler geçerli", () => {
    expect(DEMO_FILES).toHaveLength(12);
    expect(DEMO_LABELS).toHaveLength(8);
    expect(new Set(DEMO_FILES.map((f) => f.id)).size).toBe(DEMO_FILES.length);
    expect(new Set(DEMO_LABELS.map((l) => l.id)).size).toBe(DEMO_LABELS.length);
    const labelIds = new Set(DEMO_LABELS.map((l) => l.id));
    for (const f of DEMO_FILES) for (const id of f.labelIds) expect(labelIds.has(id), `${f.name}: ${id}`).toBe(true);
    for (const l of DEMO_LABELS) expect(isValidLabelColor(l.color), l.name).toBe(true);
  });

  it("gerçek Drive bağlantısı yok: webViewLink, parents, thumbnail ve gerçek kimlik yok (menüde 'Open in Drive' çıkmaz)", () => {
    for (const f of DEMO_FILES) {
      expect(f.webViewLink, f.name).toBeUndefined();
      expect(f.parents, f.name).toBeUndefined();
      expect(f.thumbnailLink, f.name).toBeUndefined();
      expect(f.id, f.name).toMatch(/^demo-\d{2}$/);
    }
  });

  it("müşteri adı, e-posta ve telefon yok (müşteri işi pazarlama örneği olarak kullanılmaz)", () => {
    const corpus = [
      JSON.stringify(DEMO_FILES),
      JSON.stringify(DEMO_LABELS),
      read("lib/demo/sample-data.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""),
      read("app/(marketing)/demo/page.tsx"),
      read("components/demo/demo-workspace.tsx"),
    ].join("\n");
    // DEMO_BLOCKED_NAMES: virgülle ayrılmış, demo verisinde geçmemesi gereken gerçek adlar (isteğe bağlı).
    const blocked = (process.env.DEMO_BLOCKED_NAMES ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    for (const name of blocked) expect(corpus.toLowerCase()).not.toContain(name);
    expect(corpus).not.toMatch(/[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/);
    expect(corpus).not.toMatch(/\+90|\b\d{3}[ -]\d{3}[ -]\d{2}[ -]\d{2}\b/);
  });

  it("yasak görsel kapı: klasör ağacı, Picker akışı, otomatik etiket ve fiyat yok", () => {
    const corpus = read("app/(marketing)/demo/page.tsx") + read("components/demo/demo-workspace.tsx") + read("lib/demo/sample-data.ts");
    expect(corpus).not.toMatch(/Pick your folder|Choose an existing Drive folder|auto-?tag|\bAI\b|\$\d|per month|free trial|credit card/i);
    for (const f of DEMO_FILES) expect(f.mimeType).not.toBe("application/vnd.google-apps.folder");
  });
});

describe("demo durumu (saf fonksiyonlar)", () => {
  it("başlangıç durumu örnek veriyi kopyalar: değiştirmek kaynağı bozmaz", () => {
    const a = createInitialState();
    const b = addTag(a, "demo-12", "l-acme");
    expect(b).not.toBe(a);
    expect(createInitialState().tags["demo-12"]).toEqual(["l-draft"]);
    expect(DEMO_FILES.find((f) => f.id === "demo-12")!.labelIds).toEqual(["l-draft"]);
  });

  it("etiket sayıları: Approved 4, Acme 5, 2026 5, Invoice 2, Draft 2, In review 3, Birch 4, Q4 4", () => {
    expect(tagCounts(createInitialState())).toEqual({
      "l-invoice": 2,
      "l-draft": 2,
      "l-review": 3,
      "l-approved": 4,
      "l-2026": 5,
      "l-acme": 5,
      "l-birch": 4,
      "l-q4": 4,
    });
  });

  it("addTag: ekler, tekrar eklemez, bilinmeyen dosya ya da etiketi yok sayar (aynı nesne döner)", () => {
    const s = createInitialState();
    const added = addTag(s, "demo-12", "l-approved");
    expect(labelsOf(added, "demo-12").map((l) => l.name)).toEqual(["Draft", "Approved"]);
    expect(addTag(added, "demo-12", "l-approved")).toBe(added);
    expect(addTag(s, "yok", "l-approved")).toBe(s);
    expect(addTag(s, "demo-12", "yok")).toBe(s);
    expect(availableTags(added, "demo-12").map((l) => l.id)).not.toContain("l-approved");
  });

  it("removeTag: çıkarır; olmayan etiket ya da dosyada aynı nesne döner", () => {
    const s = createInitialState();
    const removed = removeTag(s, "demo-01", "l-approved");
    expect(labelsOf(removed, "demo-01").map((l) => l.name)).toEqual(["Client · Acme", "2026"]);
    expect(removeTag(removed, "demo-01", "l-approved")).toBe(removed);
    expect(removeTag(s, "yok", "l-approved")).toBe(s);
    // etiket tanımı silinmez: yalnız dosyadan çıkar
    expect(removed.labels.some((l) => l.id === "l-approved")).toBe(true);
  });

  it("createTag: boşlukları sadeleştirir, yeni etiketi dosyaya uygular ve renk döndürür", () => {
    const s = createInitialState();
    const r = createTag(s, "demo-12", "  Contract   draft  ");
    expect(r.error).toBeNull();
    const created = r.state.labels.find((l) => l.id === r.labelId)!;
    expect(created.name).toBe("Contract draft");
    expect(isValidLabelColor(created.color)).toBe(true);
    expect(labelsOf(r.state, "demo-12").map((l) => l.name)).toContain("Contract draft");
    expect(r.state.labels).toHaveLength(DEMO_LABELS.length + 1);
  });

  it("createTag: aynı adlı etiketi (harf boyutu duyarsız) yeniden kullanır, ikinci kopya açmaz", () => {
    const s = createInitialState();
    const r = createTag(s, "demo-12", "approved");
    expect(r.error).toBeNull();
    expect(r.labelId).toBe("l-approved");
    expect(r.state.labels).toHaveLength(DEMO_LABELS.length);
    expect(labelsOf(r.state, "demo-12").map((l) => l.id)).toContain("l-approved");
  });

  it("createTag: boş, çok uzun ve tavan aşımı hata verir; durum değişmez", () => {
    const s = createInitialState();
    expect(createTag(s, "demo-12", "   ")).toEqual({ state: s, labelId: null, error: "empty" });
    expect(createTag(s, "demo-12", "x".repeat(MAX_TAG_NAME_LENGTH + 1)).error).toBe("too-long");
    expect(createTag(s, "demo-12", "x".repeat(MAX_TAG_NAME_LENGTH)).error).toBeNull();
    let full = s;
    for (let i = 0; full.labels.length < MAX_DEMO_LABELS; i += 1) full = createTag(full, "demo-12", `Extra ${i}`).state;
    expect(full.labels).toHaveLength(MAX_DEMO_LABELS);
    const over = createTag(full, "demo-12", "One more");
    expect(over.error).toBe("limit");
    expect(over.state).toBe(full);
    // tavanda bile var olan etiket uygulanabilir
    expect(createTag(full, "demo-01", "Invoice").error).toBeNull();
  });

  it("normalizeTagName ve toggleFilter", () => {
    expect(normalizeTagName("  a \t b  ")).toBe("a b");
    expect(toggleFilter([], "l-a")).toEqual(["l-a"]);
    expect(toggleFilter(["l-a", "l-b"], "l-a")).toEqual(["l-b"]);
  });
});

describe("arama ve etiket süzgeci: gerçek arama motoru", () => {
  const s = createInitialState();

  it("boş sorgu bütün örnek dosyaları getirir", () => {
    const r = searchDemo(s, { text: "", filterLabelIds: [] });
    expect(r.files).toHaveLength(12);
    expect(r.chips).toEqual([]);
  });

  it("tek etiket: Approved 4 dosya; çip başlığı uygulamadaki gibi 'Label is Approved'", () => {
    const r = searchDemo(s, { text: "", filterLabelIds: ["l-approved"] });
    expect(fileNames(r.files)).toEqual(
      ["acme-brand-guidelines.pdf", "acme-logo-final.pdf", "birch-q4-campaign-brief", "birch-team-photo.jpg"].sort(),
    );
    expect(r.chips.map((c) => c.text)).toEqual(["Label is Approved"]);
  });

  it("birden çok etiket VE ile daraltır (uygulamadaki itemMatchesAllChips): Approved + Client · Acme = 2 dosya", () => {
    const r = searchDemo(s, { text: "", filterLabelIds: ["l-approved", "l-acme"] });
    expect(fileNames(r.files)).toEqual(["acme-brand-guidelines.pdf", "acme-logo-final.pdf"]);
    const three = searchDemo(s, { text: "", filterLabelIds: ["l-approved", "l-acme", "l-q4"] });
    expect(three.files).toEqual([]);
  });

  it("metin dosya adında ve etiket adında arar", () => {
    expect(fileNames(searchDemo(s, { text: "invoice", filterLabelIds: [] }).files)).toEqual(["acme-invoice-0412.pdf", "birch-invoice-0923.pdf"]);
    // "teaser" yalnız dosya adında
    expect(searchDemo(s, { text: "teaser", filterLabelIds: [] }).files.map((f) => f.name)).toEqual(["launch-teaser.mp4"]);
    // "moodboard" bir adda; "draft" etiket adında (2 dosya)
    expect(fileNames(searchDemo(s, { text: "draft", filterLabelIds: [] }).files)).toEqual(["brand-moodboard.pdf", "q4-social-calendar"]);
  });

  it("'label:Ad' kısayolu metinden çıkıp çipe döner ve etiket çubuğuyla aynı sonucu verir", () => {
    const typed = searchDemo(s, { text: "label:Approved", filterLabelIds: [] });
    const bar = searchDemo(s, { text: "", filterLabelIds: ["l-approved"] });
    expect(fileNames(typed.files)).toEqual(fileNames(bar.files));
    expect(typed.chips.map((c) => c.text)).toEqual(["Label is Approved"]);
    expect(typed.residualText).toBe("");
    // çubuk + aynı etiketin kısayolu çift çip üretmez
    expect(searchDemo(s, { text: "label:Approved", filterLabelIds: ["l-approved"] }).chips).toHaveLength(1);
    // kısayol + serbest metin
    expect(searchDemo(s, { text: "label:Approved photo", filterLabelIds: [] }).files.map((f) => f.name)).toEqual(["birch-team-photo.jpg"]);
  });

  it("çözülemeyen 'label:yok' çipe dönmez, metin olarak aranır ve hata vermez", () => {
    const r = searchDemo(s, { text: "label:nonexistent", filterLabelIds: [] });
    expect(r.chips).toEqual([]);
    expect(r.files).toEqual([]);
  });

  it("etiketi dosyadan çıkarmak ve yeni etiket oluşturmak sonuçlara yansır", () => {
    const removed = removeTag(s, "demo-01", "l-approved");
    expect(searchDemo(removed, { text: "", filterLabelIds: ["l-approved"] }).files).toHaveLength(3);
    const created = createTag(s, "demo-12", "Contract");
    const hits = searchDemo(created.state, { text: "", filterLabelIds: [created.labelId!] });
    expect(names(created.state, ["demo-12"])).toEqual(hits.files.map((f) => f.name));
    // yeni etiket adıyla da bulunur
    expect(searchDemo(created.state, { text: "contract", filterLabelIds: [] }).files.map((f) => f.name)).toEqual(["brand-moodboard.pdf"]);
  });

  it("etiketlemek dosyanın konumunu DEĞİŞTİRMEZ: konum alanı etiket işlemlerinden etkilenmez", () => {
    const before = Object.fromEntries(s.files.map((f) => [f.id, f.location]));
    let next = addTag(s, "demo-12", "l-approved");
    next = removeTag(next, "demo-01", "l-acme");
    next = createTag(next, "demo-05", "Anything").state;
    expect(Object.fromEntries(next.files.map((f) => [f.id, f.location]))).toEqual(before);
  });
});

describe("bileşen işleme", () => {
  const view = () => renderToStaticMarkup(withLocale("en", createElement(DemoWorkspaceView)));

  it("sunucu işlemesi yalnız yer tutucudur (tarih biçimi sunucu/istemci farkı hidrasyonu bozmasın)", () => {
    const markup = renderToStaticMarkup(createElement(DemoWorkspace));
    expect(markup).toContain("Loading the sample files");
    expect(markup).not.toContain("acme-logo-final.pdf");
  });

  it("görünüm: 12 dosya satırı, 8 etiket düğmesi, arama kutusu ve 'uydurma veri' rozeti", () => {
    const markup = view();
    for (const f of DEMO_FILES) expect(markup, f.name).toContain(f.name);
    expect((markup.match(/aria-pressed="false"/g) ?? []).length).toBe(DEMO_LABELS.length);
    expect(markup).toContain('aria-label="Search the sample files"');
    expect(markup).toContain("Demo data · made up");
    expect(markup).toContain("12 of 12 files");
    expect(markup).toContain('aria-label="Invoice, 2 files"');
    // dosya seçilmedi: ayrıntı paneli yok
    expect(markup).not.toContain("Where it lives in Drive");
  });

  it("satır başlıkları ve menü metinleri İngilizce (kayıtlı dil Türkçe olsa da)", () => {
    const markup = view();
    expect(markup).toContain("Name");
    expect(markup).toContain("Modified");
    expect(markup).not.toContain("Ad<");
  });

  it("FixedLocaleProvider kayıtlı dili okumaz ve yazmaz; sabit dili döndürür", () => {
    const source = read("lib/i18n/i18n-context.tsx");
    const body = source.slice(source.indexOf("export function FixedLocaleProvider"), source.indexOf("export function useI18n"));
    expect(body).not.toMatch(/localStorage|document\./);
    const Probe = () => createElement("span", null, `${useI18n().locale}|${useI18n().t("dashboard.panel.colName")}`);
    expect(renderToStaticMarkup(withLocale("en", createElement(Probe)))).toBe("<span>en|Name</span>");
    expect(renderToStaticMarkup(withLocale("tr", createElement(Probe)))).toBe("<span>tr|Ad</span>");
  });
});

describe("tarihler sayfanın dilinde yazılır, tarayıcının dilinde değil (doğrulayıcı bulgusu)", () => {
  // Türkçe tarayıcıda İngilizce /demo satırlarında "2 Eki 2026" çıkıyordu (formatDate dil vermeden çağrılıyordu).
  const EN_DATE = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, 2026/;
  const TR_DATE = /\d{1,2} (?:Oca|Şub|Mar|Nis|May|Haz|Tem|Ağu|Eyl|Eki|Kas|Ara) 2026/;
  const rows = (locale: Locale) => renderToStaticMarkup(withLocale(locale, createElement(DemoWorkspaceView)));

  it("formatDate ve formatDateTime verilen dil etiketini kullanır; verilmezse eski davranış (tarayıcı dili) sürer", () => {
    expect(formatDate("2026-10-02T09:30:00Z", "en-US")).toMatch(EN_DATE);
    expect(formatDate("2026-10-02T09:30:00Z", "tr-TR")).toMatch(TR_DATE);
    expect(formatDateTime("2026-10-02T09:30:00Z", "en-US")).toMatch(EN_DATE);
    expect(formatDateTime("2026-10-02T09:30:00Z", "tr-TR")).toMatch(TR_DATE);
    expect(formatDate("2026-10-02T09:30:00Z")).toBe(new Date("2026-10-02T09:30:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }));
    expect(formatDate(undefined, "en-US")).toBe("—");
  });

  it("FixedLocaleProvider tarih dilini de sabitler (en -> en-US, tr -> tr-TR)", () => {
    const Probe = () => createElement("span", null, formatDate("2026-10-02T09:30:00Z", useI18n().dateLocale));
    expect(renderToStaticMarkup(withLocale("en", createElement(Probe)))).toMatch(EN_DATE);
    expect(renderToStaticMarkup(withLocale("tr", createElement(Probe)))).toMatch(TR_DATE);
  });

  it("/demo satırları İngilizce tarih yazar: Türkçe ay adı sızmaz", () => {
    const markup = rows("en");
    expect(markup).toMatch(EN_DATE);
    expect(markup).not.toMatch(TR_DATE);
  });

  it("satır bileşeni tarihi bağlamdan gelen dil etiketiyle yazar (sabit dilli sayfa Türkçeyse Türkçe)", () => {
    expect(rows("tr")).toMatch(TR_DATE);
  });

  it("ayrıntı panelindeki 'Modified' tarihi de aynı etiketi kullanır (kaynak taraması)", () => {
    const c = read("components/demo/demo-workspace.tsx");
    expect(c).toContain("formatDate(selected.modifiedTime, dateLocale)");
  });
});

describe("/demo küçük ekran ve ipuçları (doğrulayıcı bulgusu)", () => {
  const c = read("components/demo/demo-workspace.tsx");
  const page = read("app/(marketing)/demo/page.tsx");

  it("dar ekranda seçilen dosyanın ayrıntı paneli görünüme kaydırılır; yalnız yığılı düzende, odağı oynatmadan", () => {
    expect(c).toContain('STACKED_LAYOUT_QUERY = "(max-width: 1023px)"');
    expect(c).toMatch(/window\.matchMedia\(STACKED_LAYOUT_QUERY\)\.matches/);
    expect(c).toMatch(/detailsRef\.current\?\.scrollIntoView\?\.\(/);
    expect(c).toContain("prefers-reduced-motion: reduce");
    expect(c).toContain("[selectedId]");
    // Kaydırma eşiği ızgaranın iki sütuna geçtiği eşikle (lg = 1024px) aynı olmalı
    expect(c).toContain("lg:grid-cols-[minmax(0,1fr)_20rem]");
  });

  it("menüden gelen seçimden sonra odak ve kaydırma, Radix'in odağı tetikleyiciye geri vermesinden SONRA yapılır (ölçülen ~300 ms)", () => {
    // Önce: "Add label" yeni etiket kutusuna odaklanamıyordu ve telefonda ⋯ > Properties kaydırması ilk konuma dönüyordu.
    const ms = Number(c.match(/AFTER_MENU_CLOSE_MS = (\d+)/)?.[1]);
    expect(ms).toBeGreaterThanOrEqual(400);
    expect(c).toContain("afterMenuClose(() => newTagRef.current?.focus())");
    expect(c).toMatch(/return afterMenuClose\(\(\) => \{\s*detailsRef\.current\?\.scrollIntoView/);
    expect(c).toContain(`closest?.('[role="menu"]')`);
    expect(c).not.toMatch(/requestAnimationFrame\(\(\) => newTagRef/);
  });

  it("ipucu telefonda yolu söyler: dokunmak seçmez, ⋯ menüsünden Properties; sağ tık yalnız bilgisayarda", () => {
    expect(c).toContain("On a phone, tap ⋯ on a row and choose Properties.");
    expect(c).toContain("On a computer, right-click a row for the file menu.");
    expect(c).not.toContain("Right-click a row for the file menu.");
  });

  it("etiket sınırı mesajı doğru yolu gösterir: dosyadan çıkarmak yer açmaz, sıfırlamak açar", () => {
    expect(c).toContain("Reset the demo to add more.");
    expect(c).not.toMatch(/Remove or reset/);
    expect(c).toContain("${MAX_DEMO_LABELS} tags");
    const afterRemove = createTag(removeTag(createInitialState(), "demo-01", "l-approved"), "demo-12", "Contract");
    expect(afterRemove.state.labels).toHaveLength(DEMO_LABELS.length + 1); // çıkarma etiketi listeden silmez
  });

  it("sayfa metni 'burada hiçbir şey Drive'a bağlı değil' demez: söz örnek dosyalar içindir (kök düzen oturumu geri yükleyebilir)", () => {
    expect(page).toContain("The sample files are made up and aren&apos;t connected to Google Drive");
    expect(page).not.toContain("nothing here is connected");
  });
});

describe("gizlilik ve güvenlik: ağ, depolama, kimlik ve Drive yok", () => {
  const sources: Record<string, string> = {
    "components/demo/demo-workspace.tsx": read("components/demo/demo-workspace.tsx"),
    "components/demo/demo-signup-link.tsx": read("components/demo/demo-signup-link.tsx"),
    "lib/demo/demo-model.ts": read("lib/demo/demo-model.ts"),
    "lib/demo/sample-data.ts": read("lib/demo/sample-data.ts"),
    "app/(marketing)/demo/page.tsx": read("app/(marketing)/demo/page.tsx"),
    "app/(marketing)/demo/layout.tsx": read("app/(marketing)/demo/layout.tsx"),
  };
  const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("kaynaklarda fetch, depolama, çerez, oturum ve Drive API kullanımı yok", () => {
    for (const [name, source] of Object.entries(sources)) {
      const c = code(source);
      expect(c, `${name}: ağ`).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/);
      expect(c, `${name}: depolama`).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie/);
      expect(c, `${name}: kimlik/Drive`).not.toMatch(/firebase|useAuth|@\/lib\/auth|@\/lib\/google-drive\/api|googleapis|gapi/i);
      expect(c, `${name}: API`).not.toMatch(/\/api\//);
    }
  });

  it("kaynaklarda panel bileşeni dışında oturum gerektiren içe aktarma yok (dashboard bağlamları, workspace kapsamı)", () => {
    for (const [name, source] of Object.entries(sources)) {
      expect(code(source), name).not.toMatch(/use-workspace-scope|use-labeled-items-loader|use-drive-operations/);
    }
  });

  it("dosya eylemleri kapalı: kopyala, taşı, yeniden adlandır, sil, indir ve önizleme bildirim gösterir", () => {
    const c = code(sources["components/demo/demo-workspace.tsx"]);
    for (const action of ["onCopy", "onCut", "onDelete", "onRename", "onDownload", "onPreview", "onOpenFolder"]) {
      expect(c, action).toMatch(new RegExp(`${action}: blocked`));
    }
  });

  it("erişim jetonu boş: Drive'a gidecek hiçbir değer yok", () => {
    expect(code(sources["components/demo/demo-workspace.tsx"])).toContain('accessToken: ""');
  });
});

describe("sayfa, meta, düzen ve site haritası", () => {
  const page = read("app/(marketing)/demo/page.tsx");

  it("başlık ≤ 60 (şablonla), açıklama ≤ 160; yasaklı ifade yok", () => {
    const meta = PAGE_META.demo;
    expect(renderedTitle(meta.title).length).toBeLessThanOrEqual(60);
    expect(meta.description.length).toBeLessThanOrEqual(160);
    expect(`${meta.title} ${meta.description} ${meta.ogTitle} ${meta.ogDescription}`).not.toMatch(/\bAI\b|beta|credit card|Watch Demo|staged/i);
  });

  it("sayfa PAGE_META.demo, canonical ve OG kullanır; fiyat ve 'ücretsiz' sözü vermez; tek CTA /dashboard", () => {
    expect(page).toContain("canonical: pageUrl");
    expect(page).toContain("title: PAGE_META.demo.title");
    expect(page).toContain("...socialCards(PAGE_META.demo, pageUrl)");
    expect(page).not.toMatch(/\bfree\b|\$\d|trial|credit card/i);
    expect(read("components/demo/demo-signup-link.tsx")).toContain('const href = "/dashboard"');
    expect(page).toContain("Open FolderPls");
    expect(page).not.toMatch(/See the plans|your tags are stored in FolderPls/);
  });

  it("sayfa İngilizce-yalnız listede; düzen panel kapsamını yalnız bu rotada açar", () => {
    expect(ENGLISH_CONTENT_PATHS).toContain("/demo");
    expect(read("app/(marketing)/demo/layout.tsx")).toContain("<AppScope>{children}</AppScope>");
  });

  it("site haritasında /demo var ve tarihi bilinmediği için lastmod yok", () => {
    const entry = sitemap().find((e) => e.url === `${SITE_URL}/demo`);
    expect(entry).toBeDefined();
    expect(entry!.lastModified).toBeUndefined();
  });

  it("ilk boyama betiği /demo'da panel kapsamını hemen açar, pazarlama yollarında açmaz (yanıp sönme olmasın)", () => {
    const layout = read("app/layout.tsx");
    const m = layout.match(/const PANEL_FIRST_PAINT_SCRIPT =\s*\n?\s*('(?:[^'\\]|\\.)*');/);
    expect(m).not.toBeNull();
    const script = new Function(`return ${m![1]}`)() as string;
    const run = (pathname: string) => {
      const attrs: Record<string, string> = {};
      const doc = { documentElement: { setAttribute: (k: string, v: string) => void (attrs[k] = v) } };
      new Function("location", "document", script)({ pathname }, doc);
      return "data-fp-app" in attrs;
    };
    for (const p of ["/demo", "/demo/", "/dashboard", "/dashboard/google-drive"]) expect(run(p), p).toBe(true);
    for (const p of ["/", "/pricing", "/demonstration", "/blog/demo", "/drive-labels-checker"]) expect(run(p), p).toBe(false);
  });
});
