/**
 * Node label collision handling for dense radial layouts.
 *
 * Siblings placed close together by `layout.ts`'s arc/repulsion relaxation
 * (e.g. many files under the same folder) can end up with overlapping SVG
 * `<text>` labels once each name is more than a few characters — the old
 * 22-char truncation still let two long file names ("Görsel-004.png" /
 * "Görsel-009.png") collide. `DEFAULT_TRUNCATE_LEN` is short enough that
 * most sibling labels no longer touch at typical node spacing; the full
 * name is shown instead whenever the node is centered/selected/hovered
 * (`graph-canvas.tsx`), so nothing is permanently hidden — this only
 * shortens the *default* (unfocused) label.
 */
export const DEFAULT_TRUNCATE_LEN = 12;

export function truncateLabel(name: string, max: number = DEFAULT_TRUNCATE_LEN): string {
  if (max <= 1) return name.slice(0, max);
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

/** Etiketin düğüme göre yeri; `null` = bu düğümün etiketi çakışma yüzünden çizilmez. */
export type LabelSide = "below" | "above" | null;

export interface LabelPlacementInput {
  id: string;
  /** Düğüm merkezi, EKRAN pikseli (görünüm kutusundan bağımsız, yalnız göreli konum önemli). */
  x: number;
  y: number;
  /** Düğüm yarıçapı, piksel. */
  r: number;
  /** Etiketin görünecek metni (kısaltılmış ya da tam ad). */
  text: string;
  /** Küçük sayı önce yer alır; çakışmada büyük sayılının etiketi düşer. */
  priority: number;
}

/**
 * Düğüm adlarını çakışmadan yerleştirir (390 px'te "Brand Guide…" ile
 * "Roadmap Q4" üst üste biniyordu). Öncelik sırasıyla her etiket önce
 * düğümün altına, olmazsa üstüne konur; ikisi de başka bir etikete
 * değiyorsa o etiket çizilmez (ad `<title>` ve aria-label'da durur, üzerine
 * gelince/seçilince tam ad yine görünür). Karakter genişliği ortalama
 * 0.6 em kabul edilir (ölçülen 0.55-0.62); satır kutusu 12 px'te 15 px
 * (düğme kenarından 0.25 em sonra başlar, 1.5 em'de biter).
 */
export function placeLabels(items: readonly LabelPlacementInput[], fontPx: number): Map<string, LabelSide> {
  const result = new Map<string, LabelSide>();
  const placed: { l: number; r: number; t: number; b: number }[] = [];
  const order = items.map((item, index) => ({ item, index })).sort((a, b) => a.item.priority - b.item.priority || a.index - b.index);

  for (const { item } of order) {
    const half = (item.text.length * fontPx * 0.6) / 2 + 2;
    const l = item.x - half;
    const r = item.x + half;
    const below = { l, r, t: item.y + item.r + fontPx * 0.25, b: item.y + item.r + fontPx * 1.5 };
    const above = { l, r, t: item.y - item.r - fontPx * 1.45, b: item.y - item.r - fontPx * 0.2 };
    const hits = (box: { l: number; r: number; t: number; b: number }) =>
      placed.some((p) => box.l < p.r && box.r > p.l && box.t < p.b && box.b > p.t);

    if (!hits(below)) {
      placed.push(below);
      result.set(item.id, "below");
    } else if (!hits(above)) {
      placed.push(above);
      result.set(item.id, "above");
    } else {
      result.set(item.id, null);
    }
  }
  return result;
}
