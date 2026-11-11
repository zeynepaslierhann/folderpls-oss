"use client";

import { createContext, useContext } from "react";
import { MenuIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/i18n-context";
import { cn } from "@/lib/utils";

export type WorkspaceDialogKind = "account" | "feedback";

interface ShellNavContextValue {
  /** <768px: soldan açılan gezinme sheet'ini açar. */
  openNav: () => void;
  /**
   * Çalışma alanı menüsünün açtığı dialog'lar kabukta (sheet'in dışında) tek
   * kez render olur; böylece mobilde sheet kapanınca dialog onunla birlikte
   * kaybolmaz (spec §2.1).
   */
  openWorkspaceDialog: (kind: WorkspaceDialogKind) => void;
}

export const ShellNavContext = createContext<ShellNavContextValue>({
  openNav: () => {},
  openWorkspaceDialog: () => {},
});

export function useShellNav() {
  return useContext(ShellNavContext);
}

/** Üst çubuğun başına konan ☰ düğmesi; yalnız <768px görünür. */
export function ShellNavButton({ className }: { className?: string }) {
  const { openNav } = useShellNav();
  const { t } = useI18n();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("-ml-2 shrink-0 md:hidden", className)}
      onClick={openNav}
      aria-label={t("dashboard.panel.openNavigation")}
    >
      <MenuIcon className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}
