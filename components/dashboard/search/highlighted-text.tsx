import { segmentText } from "@/lib/search/highlight";

interface HighlightedTextProps {
  text: string;
  ranges?: [number, number][];
  className?: string;
}

/** Renders `text` with `<mark>` around the given character ranges (e.g. a name match). */
export function HighlightedText({ text, ranges, className }: HighlightedTextProps) {
  if (!ranges || ranges.length === 0) {
    return <span className={className}>{text}</span>;
  }
  const segments = segmentText(text, ranges);
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.highlighted ? (
          <mark key={i} className="-mx-0.5 rounded-sm bg-accent-soft px-0.5 text-fg">
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </span>
  );
}
