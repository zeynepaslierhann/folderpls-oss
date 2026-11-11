"use client";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DeleteIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n/i18n-context";

const COPY_KEYS = {
  permanent: {
    title: "dialogs.deleteConfirm.titlePermanent",
    message: "dialogs.deleteConfirm.messagePermanent",
  },
  recycle: {
    title: "dialogs.deleteConfirm.titleRecycle",
    message: "dialogs.deleteConfirm.messageRecycle",
  },
};

type DeleteConfirmDialogProps = {
  open: boolean;
  itemCount: number;
  isPermanent?: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmDialog(props: DeleteConfirmDialogProps) {
  const { open, itemCount, onClose, onConfirm, isPermanent = false, isLoading = false } = props;
  const { t } = useI18n();
  const keys = isPermanent ? COPY_KEYS.permanent : COPY_KEYS.recycle;

  const dismissUnlessBusy = (nextOpen: boolean) => {
    if (!nextOpen && !isLoading) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={dismissUnlessBusy}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t(keys.title)}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-fg-2">{t(keys.message).replace("{{count}}", `${itemCount}`)}</p>
        <DialogFooter>
          <Button variant="secondary" disabled={isLoading} onClick={onClose}>{t("common.cancel")}</Button>
          {/* Uygulamadaki tek "danger" dolgu: onay dialog'unun son silme düğmesi. */}
          <Button variant="danger" className="gap-2" onClick={() => onConfirm()} loading={isLoading}>
            <DeleteIcon className="h-4 w-4" aria-hidden="true" />
            {isLoading ? t("dialogs.deleteConfirm.processing") : t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
