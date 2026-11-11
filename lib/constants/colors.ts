/**
 * Color Constants
 *
 * Centralized color definitions used across the application.
 * These are preset colors for labels, tags, and other UI elements.
 */

/**
 * Preset colors for labels and tags
 * Used in: upload-dialog, create-folder-dialog, label-dialog, bulk-label-dialog, etc.
 *
 * Sönük tonlar (panel spec §1.5): yeni etiketler bu değerlerle kaydedilir.
 * Eski canlı değerler (#ef4444 …) kayıtlı veride kalır ve render anında
 * lib/tag-tone.ts → toTagTone() ile aynı tona eşlenir; migrasyon yok.
 */
export const PRESET_COLORS: string[] = [
  "#B5473A", // red
  "#B4642A", // orange
  "#9A7B12", // yellow
  "#4A8552", // green
  "#2C8090", // cyan
  "#476CA6", // blue
  "#7A5AA8", // purple
  "#AE4D7C", // pink
];

/**
 * Get a random preset color
 * Useful for default label colors
 */
export function getRandomPresetColor(): string {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
}

/**
 * Güvenlik: bir etiket rengi olarak kabul edilebilecek TEK
 * biçim: `#RRGGBB` (6 haneli hex). `label.color` doğrudan `style={{
 * backgroundColor: label.color }}` ile render ediliyor (bkz.
 * graph-toolbar.tsx / graph-side-panel.tsx); CSS `background` shorthand
 * `url(...)` kabul edebildiğinden (izleme pikseli riski) hem shorthand'ı
 * `backgroundColor`'a çevirdik hem de kaynağında (yazma anında) şekli
 * zorluyoruz. Yerel depo ve içe aktarma bunu çağırır; asıl sınır burada ve
 * render'daki güvenli CSS özelliğindedir.
 */
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidLabelColor(color: unknown): color is string {
  return typeof color === "string" && HEX_COLOR_RE.test(color);
}
