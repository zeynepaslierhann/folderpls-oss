"use client";

import { useState, useEffect, useCallback, useRef, type MouseEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useI18n } from "@/lib/i18n/i18n-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { SidebarContent } from "./sidebar-content";
import { AccountSettingsDialog } from "@/components/dashboard/account-settings-dialog";
import { FeedbackDialog } from "@/components/dashboard/feedback-dialog";
import { ShellNavContext, type WorkspaceDialogKind } from "./shell-context";
import { ContentSkeleton } from "./shell-skeleton";
import type { DashboardShellProps } from "./types";

/** Kenar çubuğu ağacında açık klasörler; `ensureExpandedFolderIds` gelince o yol açılır. */
function useExpandedFolders(sidebarNav: DashboardShellProps["sidebarNav"]) {
  const [expandedFolderIds, setOpenFolders] = useState(() => new Set<string>());

  const toggleFolderExpand = (folderId: string) => {
    const nextOpen = new Set(expandedFolderIds);
    if (!nextOpen.delete(folderId)) {
      nextOpen.add(folderId);
      sidebarNav?.onFolderExpand?.(folderId);
    }
    setOpenFolders(nextOpen);
  };

  useEffect(() => {
    const required = sidebarNav?.ensureExpandedFolderIds;
    if (!required?.length) return;
    const timer = setTimeout(() => {
      setOpenFolders((current) => new Set([...current, ...required]));
    }, 0);
    return () => clearTimeout(timer);
  }, [sidebarNav]);

  return { expandedFolderIds, toggleFolderExpand };
}

/**
 * Panel kabuğu (spec §2): 240px kenar çubuğu (<nav aria-label="Main">),
 * içerik <main id="content">, ilk odaklanabilir öğe "Skip to content".
 * <768px'te kenar çubuğu soldan açılan bir sheet olur; içinde bir öğe
 * seçilince ([data-close-nav]) kendiliğinden kapanır.
 *
 * Kabuk her zaman hemen render olur; `loading` yalnız içerik bölgesine
 * iskelet koyar (sayfa ortasında spinner yok).
 */
export function DashboardShell({
  account,
  driveStatus,
  onConnectDrive,
  onDisconnectDrive,
  loading,
  sidebarNav,
  customSidebar,
  children,
}: DashboardShellProps) {
  const { t } = useI18n();
  const { expandedFolderIds, toggleFolderExpand } = useExpandedFolders(sidebarNav);
  const [navOpen, setNavOpen] = useState(false);

  const openNav = useCallback(() => setNavOpen(true), []);
  const [workspaceDialog, setWorkspaceDialog] = useState<WorkspaceDialogKind | null>(null);
  const openWorkspaceDialog = useCallback((kind: WorkspaceDialogKind) => setWorkspaceDialog(kind), []);
  const dialogProps = (kind: WorkspaceDialogKind) => ({
    open: workspaceDialog === kind,
    onOpenChange: (open: boolean) => setWorkspaceDialog(open ? kind : null),
  });
  /** Sheet bir gezinme/menü seçimiyle kapandıysa odak ☰'a geri dönmez (yeni dialog'dan çalmaz). */
  const closedByNavigation = useRef(false);

  const sidebarContent =
    customSidebar || (
      <SidebarContent
        sidebarNav={sidebarNav}
        expandedFolderIds={expandedFolderIds}
        onToggleFolderExpand={toggleFolderExpand}
        account={account}
        driveStatus={driveStatus}
        onConnectDrive={onConnectDrive}
        onDisconnectDrive={onDisconnectDrive}
        t={t}
      />
    );

  const closeOnNavigate = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-close-nav]")) {
      closedByNavigation.current = true;
      setNavOpen(false);
    }
  };

  return (
    <ShellNavContext.Provider value={{ openNav, openWorkspaceDialog }}>
      <div className="flex h-dvh overflow-hidden bg-canvas text-fg">
        <a
          href="#content"
          className="sr-only z-[200] rounded-md bg-raised px-3 py-2 text-sm font-medium shadow-pop focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          {t("dashboard.panel.skipToContent")}
        </a>

        <nav aria-label="Main" className="hidden w-60 shrink-0 flex-col border-r border-line bg-sidebar md:flex">
          {sidebarContent}
        </nav>

        <DialogPrimitive.Root open={navOpen} onOpenChange={setNavOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/30 duration-[var(--dur-slow)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 md:hidden" />
            <DialogPrimitive.Content
              aria-describedby={undefined}
              className="fixed inset-y-0 left-0 z-[101] flex w-70 max-w-[85vw] flex-col bg-sidebar shadow-dialog duration-[var(--dur-slow)] ease-panel data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left md:hidden"
              onClickCapture={closeOnNavigate}
              onCloseAutoFocus={(e) => {
                if (closedByNavigation.current) e.preventDefault();
                closedByNavigation.current = false;
              }}
            >
              <DialogPrimitive.Title className="sr-only">{t("dashboard.panel.mainNavigation")}</DialogPrimitive.Title>
              <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col">
                {sidebarContent}
              </nav>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>

        <main id="content" tabIndex={-1} className="flex min-w-0 flex-1 flex-col overflow-hidden focus:outline-none">
          {loading ? <ContentSkeleton /> : <ErrorBoundary>{children}</ErrorBoundary>}
        </main>
      </div>
      <AccountSettingsDialog {...dialogProps("account")} />
      <FeedbackDialog {...dialogProps("feedback")} t={t} />
    </ShellNavContext.Provider>
  );
}
