/** Bytes to display (GB), at most one decimal: "9.4", "15" (not "15.0"). */
export function formatBytesToGB(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb > 0 && gb < 0.1) return "<0.1";
  return gb >= 100 ? gb.toFixed(0) : String(Number(gb.toFixed(1)));
}
