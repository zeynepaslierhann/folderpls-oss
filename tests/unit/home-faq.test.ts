import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  HOME_FAQ_EN,
  HOME_FAQ_SCHEMA_COUNT,
  HOME_FAQ_TR,
  faqPageJsonLd,
  toPlainQuotes,
} from "@/lib/marketing/home-faq";
import { ContactFAQSchema, HomepageFAQSchema } from "@/components/seo/faq-schema";

function jsonLdOf(markup: string) {
  const m = markup.match(/<script type="application\/ld\+json">([\s\S]*)<\/script>/);
  expect(m).not.toBeNull();
  // dangerouslySetInnerHTML yazar: iç metin JSON'un kendisidir (HTML-kaçışsız).
  return JSON.parse(m![1]);
}

describe("ana sayfa SSS — tek kaynak", () => {
  it("TR ve EN listeleri aynı uzunlukta ve dolu (çeviri kayması yok)", () => {
    expect(HOME_FAQ_EN.length).toBeGreaterThan(0);
    expect(HOME_FAQ_TR).toHaveLength(HOME_FAQ_EN.length);
    for (const item of [...HOME_FAQ_EN, ...HOME_FAQ_TR]) {
      expect(item.q.trim().length).toBeGreaterThan(0);
      expect(item.a.trim().length).toBeGreaterThan(0);
    }
  });

  it("JSON-LD, görünen İngilizce listenin ilk N sorusuyla birebir eşleşir", () => {
    const ld = jsonLdOf(renderToStaticMarkup(createElement(HomepageFAQSchema)));
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity).toHaveLength(HOME_FAQ_SCHEMA_COUNT);
    ld.mainEntity.forEach((entity: { name: string; acceptedAnswer: { text: string } }, i: number) => {
      expect(entity.name).toBe(toPlainQuotes(HOME_FAQ_EN[i].q));
      expect(entity.acceptedAnswer.text).toBe(toPlainQuotes(HOME_FAQ_EN[i].a));
    });
  });

  it("görünen SSS'nin ilk N sorusunun metni değişmedi (kayma kilidi: soru başlıkları)", () => {
    expect(HOME_FAQ_EN.slice(0, HOME_FAQ_SCHEMA_COUNT).map((f) => f.q)).toEqual([
      "Are my files moved out of Google Drive?",
      "Does FolderPls break my Drive folder structure?",
      "How do permissions work?",
      "Where is the metadata stored?",
      "Why filtering instead of just search?",
    ]);
  });

  it("iletişim sayfası şeması aynı üreticiyi kullanır ve geçerli FAQPage verir", () => {
    const ld = jsonLdOf(renderToStaticMarkup(createElement(ContactFAQSchema)));
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity.length).toBeGreaterThan(0);
    for (const e of ld.mainEntity) {
      expect(e["@type"]).toBe("Question");
      expect(e.acceptedAnswer["@type"]).toBe("Answer");
    }
  });
});

describe("toPlainQuotes / faqPageJsonLd", () => {
  it("tipografik tırnakları düz tırnağa çevirir, düz metne dokunmaz", () => {
    expect(toPlainQuotes("say “show me” now")).toBe('say "show me" now');
    expect(toPlainQuotes("it’s")).toBe("it's");
    expect(toPlainQuotes("plain 'x' \"y\"")).toBe("plain 'x' \"y\"");
  });

  it("boş listeden boş mainEntity üretir", () => {
    expect(faqPageJsonLd([]).mainEntity).toEqual([]);
  });
});

describe("ana sayfa SSS: ücret, hesap ve cihazlar arası etiket (9 Kas 2026, hesapsız yerel mod)", () => {
  const en = HOME_FAQ_EN.find((f) => /cost anything/i.test(f.q))!;
  const tr = HOME_FAQ_TR.find((f) => /ücretli mi/i.test(f.q))!;
  const enDevice = HOME_FAQ_EN.find((f) => /another device/i.test(f.q))!;
  const trDevice = HOME_FAQ_TR.find((f) => /başka cihazda/i.test(f.q))!;
  const enWhere = HOME_FAQ_EN.find((f) => f.q === "Where is the metadata stored?")!;

  it("ücretsiz, hesap yok, plan satışı yok", () => {
    expect(en.a).toMatch(/free and open source/);
    expect(en.a).toMatch(/There is no account/);
    expect(tr.a).toMatch(/ücretsiz ve açık kaynak/);
    expect(tr.a).toMatch(/Hesap da açmazsın/);
  });

  it("cihazlar arası etiket kendiliğinden gelmez: Drive bağlamak ya da JSON gerekir", () => {
    expect(enDevice.a).toMatch(/^Not by themselves/);
    expect(enDevice.a).toMatch(/export a JSON file/);
    expect(trDevice.a).toMatch(/^Kendiliğinden görünmez/);
  });

  it("metadata cevabı tarayıcıyı ve Drive yedeğini söyler, veritabanı demez", () => {
    expect(enWhere.a).toMatch(/your browser/);
    expect(enWhere.a).toMatch(/While Drive is connected/);
    expect(enWhere.a).not.toMatch(/database/i);
  });

  it("deneme, otomatik etiket ve Team anlatımı listede yok", () => {
    const all = JSON.stringify([...HOME_FAQ_EN, ...HOME_FAQ_TR]);
    expect(all).not.toMatch(/14-day|14 günlük|auto-?tag|otomatik etiket|Team plan/i);
  });
});
