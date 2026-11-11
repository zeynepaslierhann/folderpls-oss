/**
 * Static color map for graph node/edge types.
 *
 * `lib/graph` stays DOM-free (unit-testable under Node), so these are plain
 * hex constants rather than `var(--color-brand-*)` lookups — they mirror the
 * brand tokens in `app/globals.css` (krem/sarı/mürekkep identity) and are
 * theme-invariant on purpose, same as `--color-brand-dark`/`--color-brand-lemon`
 * there. Label nodes use the label's own custom color instead (see GraphNode.labelColor).
 */
export const GRAPH_COLORS = {
  root: "#22201B", // --fg (mürekkep): tek koyu, tek vurgulu düğüm
  rootAccent: "#FFE500", // limon (yalnız Upgrade'de dolgu; burada kullanılmaz)
  // Klasörler nötr: limon dolgu uygulamada yalnız Upgrade CTA'sında (spec §1.3).
  folder: "#E6E1D3", // --line
  folderBorder: "#8F8872", // --control
  file: "#8F8872", // --control: küçük nötr nokta
  fileBorder: "#8F8872",
  cluster: "#8F8872", // --control
  clusterBorder: "#6E6857",
  edgeHierarchy: "#B9B3A3",
  edgeLabel: "#7A5AA8", // etiket tonu: purple (lib/tag-tone)
  edgeRelation: "#B4642A", // etiket tonu: orange
} as const;

/** Koyu tema karşılıkları (panel spec §1.1 koyu nötrler, §1.5 koyu tonlar). */
export const GRAPH_COLORS_DARK: Record<keyof typeof GRAPH_COLORS, string> = {
  ...GRAPH_COLORS,
  root: "#ECE8DC",
  folder: "#33302A",
  folderBorder: "#7A7462",
  file: "#7A7462",
  fileBorder: "#7A7462",
  cluster: "#7A7462",
  clusterBorder: "#A39D8B",
  edgeHierarchy: "#4A463D",
  edgeLabel: "#A88DD6",
  edgeRelation: "#DB935A",
};

export function nodeTypeColor(type: "root" | "folder" | "file" | "cluster", dark = false): string {
  const c = dark ? GRAPH_COLORS_DARK : GRAPH_COLORS;
  switch (type) {
    case "root":
      return c.root;
    case "folder":
      return c.folder;
    case "file":
      return c.file;
    case "cluster":
      return c.cluster;
  }
}
