"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteIcon, DisconnectIcon } from "@/components/icons";
import { useDriveSession } from "@/lib/google-drive/drive-session";
import { useI18n } from "@/lib/i18n/i18n-context";
import { logger } from "@/lib/logger";
import { LocalDataPanel } from "@/components/dashboard/local-data-panel";
import { deleteLocalLabelData, getLabelStore } from "@/lib/storage";
import { useDriveAutoBackup } from "@/lib/storage/auto-backup-provider";
import { useActiveStoreKey } from "@/lib/storage/use-active-store-key";

interface AccountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Veri ve Drive penceresi: hesap yok, ayarlar bu tarayıcıdaki veriye ve Drive bağlantısına aittir. */
export function AccountSettingsDialog({ open, onOpenChange }: AccountSettingsDialogProps) {
  const { status, account, disconnectDrive } = useDriveSession();
  const { pause, resume } = useDriveAutoBackup();
  const activeStoreKey = useActiveStoreKey();
  const { t } = useI18n();
  const [busy, setBusy] = useState<"disconnect" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmWord, setConfirmWord] = useState("");

  const expectedWord = t("account.deleteDataConfirmWord");
  const driveLine =
    status === "disconnected"
      ? t("account.driveNotConnected")
      : status === "expired"
        ? t("account.driveExpired")
        : (account?.email ?? t("account.driveConnected"));
  // Hangi hesabın etiketleri açık: yalnız depo anahtarı eşleşirse e-posta gösterilir.
  const labelsLine =
    activeStoreKey === null
      ? t("account.labelsOfNoAccount")
      : account?.storeKey === activeStoreKey && account.email
        ? account.email
        : t("account.labelsOfLastAccount");

  const handleDisconnectDrive = async () => {
    if (!window.confirm(t("account.disconnectDriveConfirm"))) return;
    setBusy("disconnect");
    setError(null);
    try {
      await disconnectDrive();
      window.location.assign("/dashboard/google-drive");
    } catch (err) {
      logger.error("Drive disconnect failed:", err);
      setError(t("account.error"));
      setBusy(null);
    }
  };

  const handleDeleteData = async () => {
    if (confirmWord !== expectedWord) return;
    setBusy("delete");
    setError(null);
    try {
      // Durmazsa sayfa açılınca Drive'daki yedek silinen veriyi geri getirirdi.
      await pause();
      await deleteLocalLabelData();
      window.location.assign("/dashboard/google-drive");
    } catch (err) {
      resume();
      logger.error("Local data deletion failed:", err);
      setError(t("account.error"));
      setBusy(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
        if (!next) {
          setError(null);
          setConfirmWord("");
        }
      }}
    >
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("account.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <span className="text-fg-2">{t("account.drive")}</span>
            <span className="truncate">{driveLine}</span>
            <span className="text-fg-2">{t("account.labelsOf")}</span>
            <span className="truncate" data-testid="labels-account">
              {labelsLine}
            </span>
          </div>
          <p className="text-sm text-fg-3">{t("account.labelsPerAccount")}</p>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <LocalDataPanel store={getLabelStore()} onDataChanged={() => window.location.reload()} />

          {status !== "disconnected" && (
            <section className="space-y-2 border-t border-line pt-4">
              <h3 className="font-medium">{t("account.disconnectDrive")}</h3>
              <p className="text-sm text-fg-2">{t("account.disconnectDriveDesc")}</p>
              <Button
                variant="secondary"
                size="md"
                className="gap-2"
                onClick={handleDisconnectDrive}
                disabled={busy !== null}
                loading={busy === "disconnect"}
              >
                <DisconnectIcon className="h-4 w-4" aria-hidden="true" />
                {t("account.disconnectDrive")}
              </Button>
            </section>
          )}

          <section className="space-y-2 border-t border-line pt-4">
            <h3 className="font-medium text-danger">{t("account.deleteData")}</h3>
            <p className="text-sm text-fg-2">{t("account.deleteDataDesc").replace("{account}", labelsLine)}</p>
            <label htmlFor="local-data-delete-confirm" className="block text-sm text-fg-2">
              {t("account.deleteDataConfirmPrompt")}
            </label>
            <Input
              id="local-data-delete-confirm"
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value)}
              placeholder={expectedWord}
              className="max-w-40"
              disabled={busy !== null}
            />
          </section>
        </div>

        <DialogFooter>
          <Button
            variant="danger"
            className="gap-2"
            disabled={confirmWord !== expectedWord || busy !== null}
            loading={busy === "delete"}
            onClick={handleDeleteData}
          >
            <DeleteIcon className="h-4 w-4" aria-hidden="true" />
            {t("account.deleteDataButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
