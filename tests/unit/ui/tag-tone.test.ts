import { describe, it, expect } from "vitest";
import { toTagTone, TAG_TONE_PRESETS, tagDotStyle } from "@/lib/tag-tone";
import { PRESET_COLORS, isValidLabelColor } from "@/lib/constants/colors";

const LEGACY: Record<string, string> = {
  "#ef4444": "red",
  "#f97316": "orange",
  "#eab308": "yellow",
  "#22c55e": "green",
  "#06b6d4": "cyan",
  "#3b82f6": "blue",
  "#8b5cf6": "purple",
  "#ec4899": "pink",
};

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    })
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
}
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

describe("toTagTone (spec §1.5)", () => {
  it.each(Object.entries(LEGACY))("kayıtlı preset %s → %s", (hex, name) => {
    expect(toTagTone(hex).name).toBe(name);
    expect(toTagTone(hex.toUpperCase()).name).toBe(name);
  });

  it("sönük tonlar kendi tonlarına geri eşlenir (yeni etiketler)", () => {
    const names = TAG_TONE_PRESETS.map((h) => toTagTone(h).name);
    expect(names).toEqual(["red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"]);
  });

  it("özel renkler hue'ya göre en yakın tona düşer", () => {
    expect(toTagTone("#ff0000").name).toBe("red");
    expect(toTagTone("#00ff00").name).toBe("green");
    expect(toTagTone("#0000ff").name).toBe("blue");
    expect(toTagTone("#14b8a6").name).toBe("cyan"); // teal
    expect(toTagTone("#a855f7").name).toBe("purple");
    expect(toTagTone("#f43f5e").name).toBe("red"); // rose, hue ~350: kırmızıya (0) pembeden (330) yakın
  });

  it("gri, geçersiz ve boş renkler nötr tona gider", () => {
    expect(toTagTone("#808080").name).toBe("neutral");
    expect(toTagTone("not-a-color").name).toBe("neutral");
    expect(toTagTone(undefined).name).toBe("neutral");
  });

  it("açık noktalar en kötü açık yüzeyde ≥3:1 (WCAG 1.4.11)", () => {
    for (const hex of [...Object.keys(LEGACY), "#808080"]) {
      const tone = toTagTone(hex);
      for (const surface of ["#FBF9F3", "#FFFFFF", "#F4F1E7", "#EFEBDF", "#FFF4B8"]) {
        expect(contrast(tone.light, surface), `${tone.name} on ${surface}`).toBeGreaterThanOrEqual(3);
      }
      for (const surface of ["#1B1A17", "#24221E", "#2C2A25"]) {
        expect(contrast(tone.dark, surface), `${tone.name} dark on ${surface}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("tagDotStyle iki tema değerini taşır", () => {
    expect(tagDotStyle("#ef4444")).toEqual({ "--tag-dot": "#B5473A", "--tag-dot-dark": "#E07A6C" });
  });
});

describe("PRESET_COLORS sönük tonlara geçti, validator aynen", () => {
  it("yeni etiket seçicisi sönük tonları sunar", () => {
    expect(PRESET_COLORS).toEqual(TAG_TONE_PRESETS);
  });
  it("her preset D5 validator'ından geçer", () => {
    for (const c of PRESET_COLORS) expect(isValidLabelColor(c)).toBe(true);
    expect(isValidLabelColor("url(x)")).toBe(false);
  });
});
