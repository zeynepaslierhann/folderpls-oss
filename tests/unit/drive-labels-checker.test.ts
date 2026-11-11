import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { COMPARISON_SOURCES } from "@/lib/marketing/drive-labels-comparison";
import {
  ACCOUNT_CHOICES,
  BUSINESS_STARTER,
  CHECKER_CHECKED_ON,
  CHECKER_FAQ,
  CHECKER_SOURCES,
  EDITION_CHOICES,
  EMPTY_ANSWERS,
  OTHER_EDITION_ID,
  SUPPORTED_EDITIONS,
  chooseAccount,
  chooseEdition,
  chooseLabelsInDrive,
  evaluateChecker,
  isIncomplete,
  isSupportedEdition,
  type AccountKind,
  type CheckerAnswers,
  type CheckerResult,
} from "@/lib/marketing/drive-labels-checker";
import { CheckerResultCard, DriveLabelsChecker } from "@/components/tools/drive-labels-checker";
import { PAGE_META, renderedTitle } from "@/lib/seo/page-meta";
import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/lib/constants/site";

// TransitionLink useRouter() okur; sunucu işlemede uygulama yönlendiricisi yok.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {} }),
  usePathname: () => "/drive-labels-checker",
  useSearchParams: () => new URLSearchParams(),
}));

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const answers = (over: Partial<CheckerAnswers>): CheckerAnswers => ({ ...EMPTY_ANSWERS, ...over });

/** Bir sonucun görünen bütün metni (karşılaştırmalı iddia taramaları için). */
function resultText(r: CheckerResult): string {
  return [r.headline, r.summary, ...r.facts.map((f) => f.text), ...r.nextSteps, ...r.options.flatMap((o) => [o.title, o.text, o.linkLabel ?? ""])].join("\n");
}

/** Aracın erişebildiği bütün cevap bileşimleri. */
function allCombinations(): CheckerAnswers[] {
  const combos: CheckerAnswers[] = [EMPTY_ANSWERS];
  for (const account of ["personal", "unsure"] as AccountKind[]) combos.push(answers({ account }));
  combos.push(answers({ account: "workspace" }));
  for (const e of EDITION_CHOICES) {
    combos.push(answers({ account: "workspace", edition: e.id }));
    for (const l of ["yes", "no"] as const) combos.push(answers({ account: "workspace", edition: e.id, labelsInDrive: l }));
  }
  return combos;
}

describe("Google'ın desteklenen sürüm listesi (14 Eki 2026) kilitli", () => {
  it("listede tam 13 sürüm var ve sıra Google'ın satırıyla aynı", () => {
    expect(SUPPORTED_EDITIONS.map((e) => e.name)).toEqual([
      "Frontline Starter",
      "Frontline Standard",
      "Frontline Plus",
      "Business Standard",
      "Business Plus",
      "Enterprise Standard",
      "Enterprise Plus",
      "Education Standard",
      "Education Plus",
      "Essentials",
      "Enterprise Essentials",
      "Enterprise Essentials Plus",
      "G Suite Business",
    ]);
  });

  it("Business Starter listede DEĞİL, ama seçim kutusunda var; her listedeki sürüm de seçilebilir", () => {
    expect(isSupportedEdition(BUSINESS_STARTER.id)).toBe(false);
    const choiceIds = EDITION_CHOICES.map((e) => e.id);
    expect(choiceIds).toContain(BUSINESS_STARTER.id);
    expect(choiceIds).toContain(OTHER_EDITION_ID);
    for (const e of SUPPORTED_EDITIONS) expect(choiceIds, e.id).toContain(e.id);
    expect(new Set(choiceIds).size).toBe(choiceIds.length);
    expect(choiceIds).toHaveLength(SUPPORTED_EDITIONS.length + 2);
  });

  it("seçim kutusu etiketleri 'listede mi' bilgisini sızdırmaz", () => {
    for (const e of EDITION_CHOICES) expect(e.name, e.id).not.toMatch(/supported|not supported|✓|✗|unavailable/i);
  });

  it("kaynak adresleri karşılaştırma bileşeninin kaynaklarıyla aynı (tek doğruluk kaynağı)", () => {
    for (const s of CHECKER_SOURCES) {
      const same = COMPARISON_SOURCES.find((c) => c.id === s.id);
      expect(same?.url, s.id).toBe(s.url);
      expect(s.url).toMatch(/^https:\/\//);
    }
    expect(CHECKER_CHECKED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("evaluateChecker: karar tablosu", () => {
  it("cevap yokken ya da sürüm seçilmemişken sonuç yok", () => {
    expect(evaluateChecker(EMPTY_ANSWERS).status).toBe("incomplete");
    expect(isIncomplete(EMPTY_ANSWERS)).toBe(true);
    expect(evaluateChecker(answers({ account: "workspace" })).status).toBe("incomplete");
    expect(isIncomplete(answers({ account: "workspace" }))).toBe(true);
    expect(isIncomplete(answers({ account: "personal" }))).toBe(false);
  });

  it("kişisel hesap: 'yok', Workspace yalnız listede; FolderPls seçeneği ve karşılaştırma bağlantısı var", () => {
    const r = evaluateChecker(answers({ account: "personal" }));
    expect(r.status).toBe("unavailable");
    expect(r.headline).toMatch(/Not available/);
    expect(r.asksLabelsInDrive).toBe(false);
    expect(r.facts.some((f) => f.sourceId === "editions")).toBe(true);
    const folderpls = r.options.find((o) => o.title.includes("tagging layer"));
    expect(folderpls?.text).toContain("It is free and works with any Google account that can use Drive");
    expect(folderpls?.href).toBe("/blog/folderpls-vs-google-drive-labels");
  });

  it("Business Starter: listede değil; Business Standard'ı anan 'sürüm' seçeneği ve ücretsiz FolderPls notu", () => {
    const r = evaluateChecker(answers({ account: "workspace", edition: BUSINESS_STARTER.id }));
    expect(r.status).toBe("unavailable");
    expect(r.headline).toContain("Business Starter");
    expect(r.asksLabelsInDrive).toBe(false);
    expect(resultText(r)).toContain("Business Standard and Business Plus are on Google's list");
    expect(resultText(r)).toContain("It is free and works with any Google account that can use Drive");
  });

  it("listedeki her sürüm: 'mümkün ama yönetici kurmalı', sürüm adı geçer, mobil notu ve Drive testi sorusu var", () => {
    for (const e of SUPPORTED_EDITIONS) {
      const r = evaluateChecker(answers({ account: "workspace", edition: e.id }));
      expect(r.status, e.id).toBe("possible");
      expect(r.summary, e.id).toContain(e.name);
      expect(r.summary, e.id).toMatch(/only administrators create labels/i);
      expect(r.asksLabelsInDrive, e.id).toBe(true);
      expect(r.facts.map((f) => f.text).join(" "), e.id).toMatch(/mobile app you can view labels but you can't apply or change them/);
      expect(r.facts.every((f) => f.sourceId), e.id).toBe(true);
    }
  });

  it("'Labels görünüyor' cevabı sonraki adımları değiştirir", () => {
    const base = answers({ account: "workspace", edition: "business-plus" });
    const yes = evaluateChecker({ ...base, labelsInDrive: "yes" }).nextSteps.join(" ");
    const no = evaluateChecker({ ...base, labelsInDrive: "no" }).nextSteps.join(" ");
    const unanswered = evaluateChecker(base).nextSteps.join(" ");
    expect(yes).toContain("Apply labels");
    expect(yes).toContain("up to 100 files");
    expect(no).toContain("Ask your admin");
    expect(no).toContain("Manage Labels privilege");
    expect(unanswered).toContain("right-click a file");
    expect(new Set([yes, no, unanswered]).size).toBe(3);
  });

  it("adı geçmeyen/bilinmeyen sürüm ve emin olmayan kullanıcı: 'belirsiz'; sonuç uydurmaz", () => {
    const other = evaluateChecker(answers({ account: "workspace", edition: OTHER_EDITION_ID }));
    expect(other.status).toBe("unclear");
    expect(other.asksLabelsInDrive).toBe(false);
    expect(other.summary).toContain("13 editions");
    const unsure = evaluateChecker(answers({ account: "unsure" }));
    expect(unsure.status).toBe("unclear");
    expect(unsure.nextSteps.join(" ")).toContain("right-click a file");
  });

  it("hiçbir bileşimde sonuç hata fırlatmaz; incomplete dışındaki her sonuç dolu ve kaynaklıdır", () => {
    const sourceIds = new Set(CHECKER_SOURCES.map((s) => s.id));
    for (const a of allCombinations()) {
      const r = evaluateChecker(a);
      if (r.status === "incomplete") {
        expect(isIncomplete(a)).toBe(true);
        continue;
      }
      expect(r.headline.length, JSON.stringify(a)).toBeGreaterThan(10);
      expect(r.summary.length).toBeGreaterThan(40);
      expect(r.facts.length).toBeGreaterThan(0);
      expect(r.nextSteps.length).toBeGreaterThan(0);
      for (const f of r.facts) if (f.sourceId) expect(sourceIds.has(f.sourceId)).toBe(true);
    }
  });
});

describe("hesap türü sorusu: 'kim oluşturdu' değil, 'Workspace'e kim ödüyor' (doğrulayıcı bulgusu)", () => {
  // Kendi alan adına Workspace açan serbest çalışan, hesabı kendi kurduğu için "kişisel"i seçerdi ve
  // "Labels menüsü aramana gerek yok" cevabını alırdı. Soru ödeme/yönetici konsolu üzerinden sorulur.
  const choice = (id: AccountKind) => ACCOUNT_CHOICES.find((c) => c.id === id)!;

  it("kişisel ve iş seçeneklerinin açıklaması 'kendin oluşturdun' ölçütünü kullanmaz; Workspace aboneliğine ve yönetici konsoluna bakar", () => {
    expect(choice("personal").hint).toMatch(/No Google Workspace subscription/);
    expect(choice("workspace").hint).toMatch(/pays for Google Workspace/);
    expect(choice("workspace").hint).toMatch(/for your own business domain/);
    expect(choice("workspace").hint).toMatch(/admin console/);
    for (const c of ACCOUNT_CHOICES) expect(c.hint, c.id).not.toMatch(/created it yourself|you signed up with|An organization created it/i);
  });

  it("'emin değilim': 'kendin kaydolduysan kişisel' demez; ödeme ve yönetici konsoluyla ayırır", () => {
    const r = evaluateChecker(answers({ account: "unsure" }));
    const text = resultText(r);
    expect(text).not.toMatch(/signed up for the account yourself|created yourself/i);
    expect(r.nextSteps.join(" ")).toMatch(/nobody pays for Google Workspace/);
    expect(r.nextSteps.join(" ")).toMatch(/for your own domain/);
  });

  it("kişisel sonuç: yanlış seçimi ortaya çıkaran adım var (Workspace'e ödeme ve Drive'da sağ tık > Labels)", () => {
    const steps = evaluateChecker(answers({ account: "personal" })).nextSteps.join(" ");
    expect(steps).toMatch(/If you pay for Google Workspace, even for your own business domain/);
    expect(steps).toMatch(/choose "Work or school account"/);
    expect(steps).toMatch(/right-click a file in Drive on a computer and see a Labels item/);
  });

  it("Workspace seçenekleri ücretli plan ya da e-postayla kurulum anlatmaz: FolderPls her hesapta ücretsiz", () => {
    for (const a of [
      answers({ account: "workspace", edition: BUSINESS_STARTER.id }),
      answers({ account: "workspace", edition: OTHER_EDITION_ID }),
      answers({ account: "workspace", edition: "business-plus" }),
    ]) {
      const text = resultText(evaluateChecker(a));
      expect(text, a.edition ?? "").not.toMatch(/paid plan|set up by email|sign-up page/i);
    }
    expect(resultText(evaluateChecker(answers({ account: "workspace", edition: "business-plus" })))).toContain("free tagging layer");
  });
});

describe("cevap geçişleri", () => {
  it("hesap türü değişince sürüm ve 'Labels' cevabı sıfırlanır", () => {
    const filled = answers({ account: "workspace", edition: "business-plus", labelsInDrive: "yes" });
    expect(chooseAccount(filled, "personal")).toEqual({ account: "personal", edition: null, labelsInDrive: null });
  });

  it("sürüm değişince 'Labels' cevabı sıfırlanır; hesap türü korunur", () => {
    const filled = answers({ account: "workspace", edition: "business-plus", labelsInDrive: "no" });
    expect(chooseEdition(filled, "essentials")).toEqual({ account: "workspace", edition: "essentials", labelsInDrive: null });
  });

  it("'Labels' cevabı diğer cevapları değiştirmez", () => {
    const base = answers({ account: "workspace", edition: "enterprise-plus" });
    expect(chooseLabelsInDrive(base, "yes")).toEqual({ ...base, labelsInDrive: "yes" });
  });
});

describe("dürüstlük: ürün ve rakip cümleleri", () => {
  const corpus = allCombinations()
    .map((a) => resultText(evaluateChecker(a)))
    .concat(CHECKER_FAQ.map((f) => `${f.q} ${f.a}`), ACCOUNT_CHOICES.map((c) => `${c.label} ${c.hint}`))
    .join("\n");

  it("yapay zekâ, 'tüm Drive', beta, kart sözü, fiyat ve mutlak 'asla taşımaz' iddiası yok", () => {
    expect(corpus).not.toMatch(/\bAI\b/);
    expect(corpus).not.toMatch(/entire (?:Google )?Drive|Full Drive/i);
    expect(corpus).not.toMatch(/public beta|credit card|no card/i);
    expect(corpus).not.toMatch(/\$\d/);
    expect(corpus).not.toMatch(/never move|don'?t move your files|files? (?:is|are) never moved/i);
    expect(corpus).not.toMatch(/@|\+90|\b\d{3}[ -]\d{3}[ -]\d{2}/); // e-posta ve telefon yok
  });

  it("FolderPls tarafı kodla uyumlu: etiketler tarayıcıda, Drive aramasında görünmez; masaüstü öncelikli", () => {
    const personal = evaluateChecker(answers({ account: "personal" })).options.find((o) => o.title.includes("tagging layer"))!;
    for (const needle of ["keeps your own tags in your browser", "Drive's own search can't see them", "built for a desktop first", "Google's file picker"]) {
      expect(personal.text, needle).toContain(needle);
    }
    const workspace = evaluateChecker(answers({ account: "workspace", edition: BUSINESS_STARTER.id })).options.find((o) => o.title.includes("tagging layer"))!;
    expect(workspace.text).toBe(personal.text);
    expect(workspace.text).not.toMatch(/free plan|paid plan/);
  });

  it("Drive Labels uygun seçimse öyle denir (adil ton): 'possible' sonucu FolderPls'i zorlamaz", () => {
    const r = evaluateChecker(answers({ account: "workspace", edition: "business-standard" }));
    expect(r.options).toHaveLength(1);
    expect(r.options[0].text).toMatch(/what Drive Labels are good at/);
  });
});

describe("gizlilik: araç Google'a bağlanmaz, hiçbir şey saklamaz ya da göndermez", () => {
  const component = read("components/tools/drive-labels-checker.tsx");
  const lib = read("lib/marketing/drive-labels-checker.ts");

  it("bileşen ve mantık dosyasında ağ, depolama, kimlik kullanımı yok", () => {
    for (const [name, source] of [["component", component], ["lib", lib]] as const) {
      const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      expect(code, `${name}: ağ çağrısı`).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/);
      expect(code, `${name}: depolama`).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie/);
      expect(code, `${name}: kimlik`).not.toMatch(/firebase|useAuth|@\/lib\/auth|@\/lib\/google-drive|googleapis|gapi/i);
      expect(code, `${name}: adrese yazma`).not.toMatch(/history\.(?:push|replace)State|window\.location|useRouter\(|useSearchParams/);
    }
  });

  it("sayfa metni gizlilik sözünü söyler", () => {
    const markup = renderToStaticMarkup(createElement(DriveLabelsChecker));
    expect(markup).toContain("runs in your browser");
    expect(markup).toContain("aren&#x27;t sent or saved");
    // Söz aracın kendisi içindir: sayfa kabuğu (kök düzen) Google'a bağlanabilir, bu yüzden "hiçbir Google hizmeti" denmez.
    expect(markup).toContain("doesn&#x27;t sign in to Google or read your Drive");
    expect(markup).not.toMatch(/any Google service|no network request|never touch/i);
  });
});

describe("bileşen işleme", () => {
  it("ilk durumda üç hesap türü seçeneği ve yönlendirme var, sonuç kartı yok", () => {
    const markup = renderToStaticMarkup(createElement(DriveLabelsChecker));
    expect((markup.match(/type="radio"/g) ?? []).length).toBe(ACCOUNT_CHOICES.length);
    expect(markup).toContain("Personal Google account");
    expect(markup).toContain("Work or school account");
    expect(markup).not.toContain("checker-result");
    expect(markup).not.toContain("Which Google Workspace edition?");
    expect(markup).toContain("Your answers stay on this page");
  });

  it("sonuç kartı: durum, başlık, kaynak dipnotları ve seçenekler görünür", () => {
    const personal = evaluateChecker(answers({ account: "personal" }));
    const markup = renderToStaticMarkup(createElement(CheckerResultCard, { result: personal, labelsInDrive: null, onLabelsInDrive: () => {}, groupId: "t" }));
    expect(markup).toContain('data-status="unavailable"');
    expect(markup).toContain(personal.headline);
    expect(markup).toContain('href="#checker-source-editions"');
    expect(markup).toContain("FolderPls vs Drive Labels, side by side");
    expect(markup).not.toContain("Do you see Labels");
  });

  it("listedeki sürümde 'Labels görünüyor mu' sorusu ve seçili cevap işlenir", () => {
    const r = evaluateChecker(answers({ account: "workspace", edition: "business-plus", labelsInDrive: "no" }));
    const markup = renderToStaticMarkup(createElement(CheckerResultCard, { result: r, labelsInDrive: "no", onLabelsInDrive: () => {}, groupId: "t" }));
    expect(markup).toContain("Do you see Labels when you right-click a file in Drive on a computer?");
    const input = (value: string) => markup.match(new RegExp(`<input[^>]*value="${value}"[^>]*>`))?.[0] ?? "";
    expect(input("no")).toContain('checked=""');
    expect(input("yes")).not.toContain("checked");
    expect(markup).toContain("Manage Labels privilege");
  });

  it("incomplete sonuç hiçbir şey işlemez", () => {
    const markup = renderToStaticMarkup(createElement(CheckerResultCard, { result: evaluateChecker(EMPTY_ANSWERS), labelsInDrive: null, onLabelsInDrive: () => {}, groupId: "t" }));
    expect(markup).toBe("");
  });
});

describe("sayfa, meta ve site haritası", () => {
  const page = read("app/(marketing)/drive-labels-checker/page.tsx");

  it("başlık/açıklama sınırları: render edilen başlık ≤ 60, açıklama ≤ 160", () => {
    const meta = PAGE_META.driveLabelsChecker;
    expect(renderedTitle(meta.title).length).toBeLessThanOrEqual(60);
    expect(meta.description.length).toBeLessThanOrEqual(160);
    expect(meta.title.toLowerCase()).toContain("drive labels");
    expect(meta.description).not.toMatch(/\bAI\b|beta|credit card/i);
  });

  it("sayfa kendi canonical adresini, OG görselini ve tarihli kaynak listesini taşır", () => {
    expect(page).toContain("canonical: pageUrl");
    expect(page).toContain("...socialCards(PAGE_META.driveLabelsChecker, pageUrl)");
    expect(page).toContain("CHECKER_SOURCES.map");
    expect(page).toContain("dateModified: CHECKER_CHECKED_ON");
    expect(page).toContain("SUPPORTED_EDITIONS.map");
  });

  it("site haritasında araç var ve son doğrulama gününü lastmod olarak taşır", () => {
    const byUrl = new Map(sitemap().map((e) => [e.url, e]));
    const tool = byUrl.get(`${SITE_URL}/drive-labels-checker`);
    expect(tool).toBeDefined();
    expect(tool!.lastModified).toEqual(new Date(CHECKER_CHECKED_ON));
  });
});
