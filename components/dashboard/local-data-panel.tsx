"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { AlertTriangle, CheckCircle2, Clock, CloudOff, CloudUpload, Download, PauseCircle, Upload, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDriveSession } from "@/lib/google-drive/drive-session";
import { useI18n } from "@/lib/i18n/i18n-context";
import { logger } from "@/lib/logger";
import { claimLegacyLabels, hasUnclaimedLegacyLabels, type SyncableLabelStore } from "@/lib/storage";
import type { AutoBackupPhase } from "@/lib/storage/auto-backup";
import { useDriveAutoBackup } from "@/lib/storage/auto-backup-provider";
import { DRIVE_BACKUP_FILE_NAME } from "@/lib/storage/drive-backup";
import { hasMergeChanges } from "@/lib/storage/merge";
import { parseSnapshot, serializeSnapshot, SnapshotError } from "@/lib/storage/snapshot";
import { useActiveStoreKey } from "@/lib/storage/use-active-store-key";

interface LocalDataPanelProps {
  store: SyncableLabelStore;
  /** İçe aktarma ya da eşitleme yerel veriyi değiştirdiğinde çağrılır. */
  onDataChanged?: () => void;
}

const SNAPSHOT_ERROR_KEYS = {
  invalid_json: "localData.errorInvalidFile",
  not_folderpls: "localData.errorInvalidFile",
  too_large: "localData.errorTooLarge",
  unsupported_version: "localData.errorNewerVersion",
} as const;

const BACKUP_STATUS: Record<AutoBackupPhase, { icon: LucideIcon; tone: string; label: string }> = {
  backed_up: { icon: CheckCircle2, tone: "text-success", label: "localData.backupBackedUp" },
  pending: { icon: Clock, tone: "text-fg-2", label: "localData.backupPending" },
  needs_connection: { icon: CloudOff, tone: "text-warning", label: "localData.backupNeedsConnection" },
  failed: { icon: AlertTriangle, tone: "text-danger", label: "localData.backupFailed" },
  paused: { icon: PauseCircle, tone: "text-fg-2", label: "localData.backupPaused" },
};

/** Etiketlerin dışa/içe aktarımı ve Drive yedeği. */
export function LocalDataPanel({ store, onDataChanged }: LocalDataPanelProps) {
  const { t, locale } = useI18n();
  const { connectDrive, connectIssue, getValidToken } = useDriveSession();
  const { phase, lastBackupAt, hasPendingChanges, retrying, syncNow } = useDriveAutoBackup();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"export" | "import" | "drive" | "legacy" | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const activeStoreKey = useActiveStoreKey();
  const [legacyWaiting, setLegacyWaiting] = useState(false);

  // Önceki sürümün etiketleri sahibi belli olmadığı için ayrı durabilir; yalnız kullanıcı taşır.
  useEffect(() => {
    let cancelled = false;
    if (!activeStoreKey) return;
    hasUnclaimedLegacyLabels()
      .then((waiting) => {
        if (!cancelled) setLegacyWaiting(waiting);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeStoreKey]);

  const fail = (err: unknown, fallback: string) => {
    logger.error("Local data action failed:", err);
    const text = err instanceof SnapshotError ? t(SNAPSHOT_ERROR_KEYS[err.code]) : fallback;
    setMessage({ type: "error", text });
  };

  const handleExport = async () => {
    setBusy("export");
    setMessage(null);
    try {
      const blob = new Blob([serializeSnapshot(await store.exportSnapshot())], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = DRIVE_BACKUP_FILE_NAME;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: t("localData.exported") });
    } catch (err) {
      fail(err, t("localData.errorGeneric"));
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy("import");
    setMessage(null);
    try {
      const { snapshot, skipped } = parseSnapshot(await file.text());
      const stats = await store.importSnapshot(snapshot);
      const text = t("localData.imported")
        .replace("{added}", String(stats.added))
        .replace("{updated}", String(stats.updated))
        .replace("{removed}", String(stats.removed))
        .replace("{skipped}", String(skipped));
      setMessage({ type: "success", text });
      if (hasMergeChanges(stats)) onDataChanged?.();
    } catch (err) {
      fail(err, t("localData.errorGeneric"));
    } finally {
      setBusy(null);
    }
  };

  const handleDriveSync = async () => {
    setBusy("drive");
    setMessage(null);
    try {
      const token = getValidToken() ?? (await connectDrive());
      if (!token) return;
      const result = await syncNow();
      if (!result) return;
      setMessage({ type: "success", text: t("localData.driveSynced").replace("{file}", DRIVE_BACKUP_FILE_NAME) });
      if (result.localChanged) onDataChanged?.();
    } catch (err) {
      fail(err, t("localData.errorDrive"));
    } finally {
      setBusy(null);
    }
  };

  const handleClaimLegacy = async () => {
    setBusy("legacy");
    setMessage(null);
    try {
      const result = await claimLegacyLabels();
      setLegacyWaiting(false);
      setMessage({ type: "success", text: t("localData.legacyClaimed") });
      if (result === "migrated") onDataChanged?.();
    } catch (err) {
      fail(err, t("localData.errorGeneric"));
    } finally {
      setBusy(null);
    }
  };

  const backupStatus = BACKUP_STATUS[phase];
  const BackupIcon = backupStatus.icon;
  const backupHint = {
    backed_up: "localData.backupBackedUpHint",
    pending: retrying ? "localData.backupRetryHint" : "localData.backupPendingHint",
    needs_connection: hasPendingChanges ? "localData.backupNeedsConnectionPendingHint" : "localData.backupNeedsConnectionHint",
    failed: "localData.backupFailedHint",
    paused: "localData.backupPausedHint",
  }[phase];
  const lastBackupText = lastBackupAt
    ? t("localData.backupLastAt").replace(
        "{time}",
        new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(lastBackupAt)
      )
    : t("localData.backupNever");

  return (
    <section className="space-y-2 border-t border-line pt-4" aria-label={t("localData.title")}>
      <h3 className="font-medium">{t("localData.title")}</h3>
      <p className="text-sm text-fg-2">{t("localData.description")}</p>
      <div role="status" className="flex items-start gap-2 rounded-md border border-line px-3 py-2">
        <BackupIcon className={`mt-0.5 h-4 w-4 shrink-0 ${backupStatus.tone}`} aria-hidden="true" />
        <div className="min-w-0 space-y-0.5">
          <p className={`text-sm font-medium ${backupStatus.tone}`}>{t(backupStatus.label)}</p>
          <p className="text-sm text-fg-2">{t(backupHint)}</p>
          <p className="text-sm text-fg-3">{lastBackupText}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="md" className="gap-2" onClick={handleExport} disabled={busy !== null} loading={busy === "export"}>
          <Download className="h-4 w-4" aria-hidden="true" />
          {t("localData.export")}
        </Button>
        <Button variant="secondary" size="md" className="gap-2" onClick={() => fileInput.current?.click()} disabled={busy !== null} loading={busy === "import"}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          {t("localData.import")}
        </Button>
        <Button variant="secondary" size="md" className="gap-2" onClick={handleDriveSync} disabled={busy !== null} loading={busy === "drive"}>
          <CloudUpload className="h-4 w-4" aria-hidden="true" />
          {t("localData.driveSync")}
        </Button>
      </div>
      <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
      {legacyWaiting && activeStoreKey && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-line px-3 py-2">
          <p className="min-w-0 flex-1 text-sm text-fg-2">{t("localData.legacyWaiting")}</p>
          <Button variant="secondary" size="sm" onClick={handleClaimLegacy} disabled={busy !== null} loading={busy === "legacy"}>
            {t("localData.legacyClaim")}
          </Button>
        </div>
      )}
      {connectIssue && (
        <p role="alert" className="text-sm text-danger">
          {t(connectIssue === "popup_blocked" ? "dashboard.drivePopupBlockedBody" : "dashboard.driveConnectFailed")}
        </p>
      )}
      {message && (
        <p role="status" className={`text-sm ${message.type === "error" ? "text-danger" : "text-success"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
