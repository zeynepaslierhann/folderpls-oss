import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CONTACT_EMAIL } from "@/lib/constants/site";

const pageSource = readFileSync(path.resolve(__dirname, "../../app/(marketing)/contact/page.tsx"), "utf8");

describe("/contact: görünür iletişim adresi", () => {
  it("varsayılan adres boş; işleten kişi ortam değişkeniyle verir", () => {
    expect(CONTACT_EMAIL).toBe("");
  });

  it("adres yalnız mailto değil, görünür metin olarak da yazılır", () => {
    // JSX metni: <a …>{CONTACT_EMAIL}</a>; düğme bağlantısı yalnız ikon + "Get in Touch" taşır.
    expect(pageSource).toMatch(/>\s*\{CONTACT_EMAIL\}\s*</);
    expect(pageSource).toMatch(/href=\{`mailto:\$\{CONTACT_EMAIL\}`\}/);
  });

  it("sayfada elle yazılmış başka adres ya da telefon yok", () => {
    expect(pageSource).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(pageSource).not.toMatch(/\+\d{2}\s?\d{3}/);
  });
});
