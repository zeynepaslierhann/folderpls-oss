"use client";

import { useTheme } from "next-themes";
import { ChevronDownIcon, FolderSearchIcon, DriveIcon, FeedbackIcon, SunIcon, DisconnectIcon, AccountSettingsIcon } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DriveAccount } from "@/lib/google-drive/api/storage";
import type { DriveConnectionStatus } from "@/lib/google-drive/drive-connection-state";
import { useShellNav } from "./shell-context";
import { PanelBrandLogo } from "@/components/brand/panel-brand-logo";

interface WorkspaceMenuProps {
  account: DriveAccount | null;
  driveStatus: DriveConnectionStatus;
  onConnectDrive: () => void;
  onDisconnectDrive: () => Promise<void>;
  t: (key: string) => string;
  onChangeFolder?: () => void;
  changingFolder?: boolean;
}

/** Çalışma alanı menüsü: Drive hesabı, veri ayarları, tema, geri bildirim, Drive bağlantısı. */
export function WorkspaceMenu({
  account,
  driveStatus,
  onConnectDrive,
  onDisconnectDrive,
  t,
  onChangeFolder,
  changingFolder,
}: WorkspaceMenuProps) {
  const { theme, setTheme } = useTheme();
  const { openWorkspaceDialog } = useShellNav();
  const connected = driveStatus === "connected";
  const accountLine = account?.email ?? account?.displayName;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-8 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-base font-medium text-fg hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-hover"
        aria-label={`${t("dashboard.panel.workspaceMenu")}: FolderPls`}
      >
        <PanelBrandLogo className="size-5 shrink-0 rounded-sm object-contain" />
        <span className="min-w-0 flex-1 truncate">FolderPls</span>
        <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-fg-3" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium text-fg">
            {connected && accountLine ? accountLine : t("dashboard.panel.dataInThisBrowser")}
          </p>
          <p className="truncate text-xs text-fg-3">
            {t(
              connected
                ? "dashboard.panel.driveConnected"
                : driveStatus === "expired"
                  ? "dashboard.panel.driveExpired"
                  : "dashboard.panel.driveNotConnected"
            )}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem data-close-nav="" onSelect={() => openWorkspaceDialog("account")}>
          <AccountSettingsIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
          {t("dashboard.panel.accountSettings")}
        </DropdownMenuItem>
        {onChangeFolder && (
          <DropdownMenuItem data-close-nav="" disabled={changingFolder} onSelect={onChangeFolder}>
            <FolderSearchIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
            {t("dashboard.panel.changeFolder")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <SunIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
            {t("dashboard.panel.theme")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-40">
            <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light">{t("dashboard.panel.themeLight")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">{t("dashboard.panel.themeDark")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">{t("dashboard.panel.themeSystem")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem data-close-nav="" onSelect={() => openWorkspaceDialog("feedback")}>
          <FeedbackIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
          {t("dashboard.panel.sendFeedback")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {driveStatus === "disconnected" ? (
          <DropdownMenuItem data-close-nav="" onSelect={onConnectDrive}>
            <DriveIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
            {t("dashboard.connectDrive")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem data-close-nav="" onSelect={() => void onDisconnectDrive()}>
            <DisconnectIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
            {t("account.disconnectDrive")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
