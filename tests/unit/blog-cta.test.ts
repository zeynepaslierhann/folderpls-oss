import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { POST_CTA } from "@/components/blog/post-cta";

const page = readFileSync(path.resolve(__dirname, "../../app/(marketing)/blog/[slug]/page.tsx"), "utf8");
const component = readFileSync(path.resolve(__dirname, "../../components/blog/post-cta.tsx"), "utf8");

describe("blog yazı sonu çağrısı", () => {
  it("her yazının sonunda render edilir (yazı gövdesinden sonra, 'Keep reading'ten önce)", () => {
    const body = page.indexOf("<PostBody");
    const cta = page.indexOf("<PostCta />");
    const related = page.indexOf('aria-labelledby="related-heading"');
    expect(body).toBeGreaterThan(-1);
    expect(cta).toBeGreaterThan(body);
    expect(related).toBeGreaterThan(cta);
  });

  it("tek ve açık bir sonraki adım: /dashboard (hesap yok)", () => {
    expect(POST_CTA.href).toBe("/dashboard");
    expect(POST_CTA.label).toBe("Open FolderPls");
  });

  it("bağlantı kampanya parametresi taşımaz: sunucu tarafı sayım kaldırıldı", () => {
    expect(component).not.toMatch(/useCarriedHref/);
    expect(component).toMatch(/<TransitionLink href=\{POST_CTA\.href\}>/);
  });

  it("fiyat, ücretsiz ya da deneme sözü vermez; kanıtsız iddia taraması claim-scan.test.ts'te", () => {
    const text = `${POST_CTA.heading} ${POST_CTA.body} ${POST_CTA.label}`;
    expect(text).not.toMatch(/\bfree\b|\$\d|credit card|trial/i);
  });
});
