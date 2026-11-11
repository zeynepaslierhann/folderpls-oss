/**
 * Etiket tonları (spec §1.5). Kayıtlı `#RRGGBB` değerleri DEĞİŞMEZ;
 * render anında her renk en yakın sönük tona eşlenir. Çip zemini nötr kalır,
 * renk yalnız 8px noktada taşınır — okunabilirlik etiket renginden bağımsız.
 *
 * Yakınlık HSL hue'ya göre (dairesel) hesaplanır; böylece özel renkler de bir
 * tona düşer. Doygunluğu çok düşük (gri) renkler nötr tona gider.
 */
export type TagToneName = "red" | "orange" | "yellow" | "green" | "cyan" | "blue" | "purple" | "pink" | "neutral";

export interface TagTone {
  name: TagToneName;
  /** Açık temada nokta rengi (her yüzeyde ≥3:1). */
  light: string;
  /** Koyu temada nokta rengi. */
  dark: string;
}

interface ToneDef extends TagTone {
  /** Eski canlı preset (kayıtlı veride olabilir); birebir eşleşir. */
  legacy: string;
  /** Özel renkler için çapa (saf mavi #0000ff = 240° mavide kalsın diye mor 270°). */
  hue: number;
}

const TONES: ToneDef[] = [
  { name: "red", legacy: "#ef4444", hue: 0, light: "#B5473A", dark: "#E07A6C" },
  { name: "orange", legacy: "#f97316", hue: 25, light: "#B4642A", dark: "#DB935A" },
  { name: "yellow", legacy: "#eab308", hue: 45, light: "#9A7B12", dark: "#D3B44A" },
  { name: "green", legacy: "#22c55e", hue: 142, light: "#4A8552", dark: "#7DB585" },
  { name: "cyan", legacy: "#06b6d4", hue: 189, light: "#2C8090", dark: "#64B3C0" },
  { name: "blue", legacy: "#3b82f6", hue: 217, light: "#476CA6", dark: "#7F9FD6" },
  { name: "purple", legacy: "#8b5cf6", hue: 270, light: "#7A5AA8", dark: "#A88DD6" },
  { name: "pink", legacy: "#ec4899", hue: 330, light: "#AE4D7C", dark: "#D682AA" },
];

const NEUTRAL: TagTone = { name: "neutral", light: "#6E6857", dark: "#948E7D" };

/** Yeni etiket seçicisinin sunduğu renkler: sönük açık tonlar. */
export const TAG_TONE_PRESETS: string[] = TONES.map((t) => t.light);

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return { h, s, l };
}

const hueDistance = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

export function toTagTone(hex: string | null | undefined): TagTone {
  if (!hex) return NEUTRAL;
  const lower = hex.toLowerCase();
  const exact = TONES.find((t) => t.legacy === lower || t.light.toLowerCase() === lower || t.dark.toLowerCase() === lower);
  if (exact) return { name: exact.name, light: exact.light, dark: exact.dark };
  const hsl = hexToHsl(hex);
  if (!hsl || hsl.s < 0.12 || hsl.l < 0.06 || hsl.l > 0.97) return NEUTRAL;
  let best = TONES[0];
  for (const t of TONES) if (hueDistance(hsl.h, t.hue) < hueDistance(hsl.h, best.hue)) best = t;
  return { name: best.name, light: best.light, dark: best.dark };
}

/**
 * Nokta için inline stil: tema geçişini CSS değişkeniyle yapar
 * (`.tag-dot` sınıfı açık/koyu değeri seçer).
 */
export function tagDotStyle(hex: string | null | undefined): Record<string, string> {
  // Hex olmayan değerler (örn. yerleşik durum renkleri `hsl(var(--status-…))`)
  // zaten tema token'ıdır; olduğu gibi kullanılır.
  if (hex && !hex.startsWith("#")) return { "--tag-dot": hex, "--tag-dot-dark": hex };
  const tone = toTagTone(hex);
  return { "--tag-dot": tone.light, "--tag-dot-dark": tone.dark };
}
