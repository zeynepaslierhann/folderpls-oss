import type { CSSProperties } from "react";
import { DocumentIcon, CheckIcon } from "@/components/icons";

const ROWS = ["Client brief", "Q3 budget", "Logo final"];

/**
 * Mock of the Google Picker file list — the first row "selects" (CSS pop).
 * Shows files, not folders: whether choosing a folder in the Picker also exposes the files
 * inside it (drive.file) is unmeasured, so the landing page does not depict it.
 */
export function PickerVisual() {
  return (
    <div className="w-full max-w-xs rounded-xl border border-border bg-card shadow-lg overflow-hidden" aria-hidden>
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5 bg-muted/40">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
        </div>
        {/* Google's own Picker chrome — not FolderPls copy, so it stays English regardless of site locale. */}
        <span className="ml-2 text-xs font-medium text-muted-foreground">Select files</span>
      </div>
      <div className="p-2">
        {ROWS.map((name, i) => (
          <div
            key={name}
            className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 ${i === 0 ? "bg-brand-ocean/15" : "opacity-75"}`}
          >
            <span className="flex items-center gap-2.5 text-sm text-foreground">
              <DocumentIcon className="h-4 w-4 text-brand-ocean-ink" />
              {name}
            </span>
            {i === 0 && (
              <span
                className="motion-pop flex h-5 w-5 items-center justify-center rounded-full bg-brand-lemon"
                style={{ "--enter-i": 5 } as CSSProperties}
              >
                <CheckIcon className="h-3 w-3 text-brand-dark" />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
