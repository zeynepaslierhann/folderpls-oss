"use client";

import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DetailsPanelIcon, CloseIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { DETAILS_DOCK_QUERY } from "@/lib/hooks/use-details-panel-open";
import { useI18n } from "@/lib/i18n/i18n-context";

interface DetailsDockProps {
  open: boolean;
  onClose: () => void;
  /** Gösterilecek panel; yoksa "bir dosya seçin" ipucu. */
  children?: ReactNode;
}

function EmptyDetails({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-line pl-4 pr-2">
        <h2 className="text-base font-semibold">{t("dashboard.panel.showDetails")}</h2>
        <Button variant="ghost" size="icon-md" onClick={onClose} aria-label={t("common.close")}>
          <CloseIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <DetailsPanelIcon className="mb-3 h-8 w-8 text-fg-3" aria-hidden="true" />
        <p className="text-sm text-fg-2">{t("dashboard.panel.detailsHint")}</p>
      </div>
    </div>
  );
}

/**
 * Detay paneli yerleşimi (spec §2.4): ≥1280px'te 360px DOCKED (içeriği
 * daraltır), altında sağdan sheet, <768px'te alttan sheet. Aynı anda tek
 * örnek render olur (notlar vb. durum ikilenmez).
 */
export function DetailsDock({ open, onClose, children }: DetailsDockProps) {
  const { t } = useI18n();
  const docked = useMediaQuery(DETAILS_DOCK_QUERY);
  const mobile = useMediaQuery("(max-width: 767px)");
  if (!open) return null;
  const content = children ?? <EmptyDetails onClose={onClose} />;

  if (docked) {
    return (
      <aside aria-label={t("dashboard.panel.showDetails")} className="flex h-full w-90 shrink-0 flex-col overflow-hidden border-l border-line bg-raised">
        {content}
      </aside>
    );
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/30 duration-[var(--dur-slow)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={
            mobile
              ? "fixed inset-x-0 bottom-0 z-[101] flex h-[85dvh] flex-col overflow-hidden rounded-t-lg bg-raised shadow-dialog duration-[var(--dur-slow)] ease-panel data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom"
              : "fixed inset-y-0 right-0 z-[101] flex w-90 max-w-[90vw] flex-col overflow-hidden bg-raised shadow-dialog duration-[var(--dur-slow)] ease-panel data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right"
          }
        >
          <DialogPrimitive.Title className="sr-only">{t("dashboard.panel.showDetails")}</DialogPrimitive.Title>
          {content}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
