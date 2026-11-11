import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CONTACT_FAQ } from "@/lib/marketing/contact-faq";
import { HOME_FAQ_EN, HOME_FAQ_TR, toPlainQuotes } from "@/lib/marketing/home-faq";
import { ContactFAQSchema } from "@/components/seo/faq-schema";

const pageSource = readFileSync(path.resolve(__dirname, "../../app/(marketing)/contact/page.tsx"), "utf8");

describe("/contact SSS: tek kaynak ve doğruluk", () => {
  it("görünen liste ile FAQPage JSON-LD aynı kaynaktan gelir (kayma yok)", () => {
    const markup = renderToStaticMarkup(createElement(ContactFAQSchema));
    const ld = JSON.parse(markup.match(/<script type="application\/ld\+json">([\s\S]*)<\/script>/)![1]);
    expect(ld.mainEntity).toHaveLength(CONTACT_FAQ.length);
    ld.mainEntity.forEach((e: { name: string; acceptedAnswer: { text: string } }, i: number) => {
      expect(e.name).toBe(toPlainQuotes(CONTACT_FAQ[i].q));
      expect(e.acceptedAnswer.text).toBe(toPlainQuotes(CONTACT_FAQ[i].a));
    });
  });

  it("sayfa SSS'yi CONTACT_FAQ'tan çizer (ikinci kopya yok)", () => {
    expect(pageSource).toMatch(/CONTACT_FAQ\.map\(/);
    expect(pageSource).not.toMatch(/const faqs = \[/);
  });

  it("klasör yapısı cevabı mutlak söz vermez ve elle taşıma/silmeyi saklamaz (ana sayfa SSS'siyle aynı olgu)", () => {
    const answers = [
      CONTACT_FAQ.find((f) => /folder structure/i.test(f.q))!.a,
      HOME_FAQ_EN.find((f) => /folder structure/i.test(f.q))!.a,
    ];
    for (const answer of answers) {
      expect(answer).not.toMatch(/^Never|completely independently|completely on top/i);
      expect(answer).toMatch(/copy, move, rename or delete/);
    }
    const tr = HOME_FAQ_TR.find((f) => /klasör yapım/i.test(f.q))!.a;
    expect(tr).not.toMatch(/^Asla|tamamen bağımsız/i);
    expect(tr).toMatch(/kopyalamadıkça, taşımadıkça/);
  });
});
