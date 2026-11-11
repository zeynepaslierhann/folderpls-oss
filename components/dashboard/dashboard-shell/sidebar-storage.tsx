"use client";

import { formatBytesToGB } from "./utils";

interface SidebarStorageProps {
  driveStorage: { limit: number | null; usage: number };
  t: (key: string) => string;
}

/**
 * Depolama (spec §2.1): tek satır metin + 2px çubuk (--fg-2 dolgu, --line
 * iz). %90'ı aşınca dolgu --warning olur.
 */
export function SidebarStorage({ driveStorage, t }: SidebarStorageProps) {
  if (driveStorage.limit == null) {
    return (
      <p className="px-2 text-xs text-fg-3 tabular-nums">
        {t("dashboard.panel.storageUnlimited").replace("{used}", formatBytesToGB(driveStorage.usage))}
      </p>
    );
  }
  const ratio = driveStorage.limit > 0 ? driveStorage.usage / driveStorage.limit : 0;
  const pct = Math.min(100, ratio * 100);
  const full = driveStorage.usage >= driveStorage.limit;
  const text = t("dashboard.panel.storageOf")
    .replace("{used}", formatBytesToGB(driveStorage.usage))
    .replace("{total}", formatBytesToGB(driveStorage.limit));
  return (
    <div className="space-y-1.5 px-2">
      <p className="text-xs text-fg-3 tabular-nums">
        {full ? <span className="font-medium text-warning">{t("dashboard.driveStorageFull")} · </span> : null}
        {text}
      </p>
      <div
        className="h-0.5 w-full overflow-hidden rounded-full bg-line"
        role="meter"
        aria-label={t("dashboard.driveStorage")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div className={`h-full rounded-full ${ratio > 0.9 ? "bg-warning" : "bg-fg-2"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
