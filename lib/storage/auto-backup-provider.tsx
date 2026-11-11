"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { findFolderPlsInRoot } from "@/lib/google-drive/folderpls-ensure";
import { useDriveSession } from "@/lib/google-drive/drive-session";
import { getAccountStore, getActiveStoreKey } from "./account-stores";
import { DriveAutoBackup, type AutoBackupView } from "./auto-backup";
import { readPickedFileIds } from "./drive-backup";
import { useActiveStoreKey } from "./use-active-store-key";

const DriveAutoBackupContext = createContext<DriveAutoBackup | undefined>(undefined);

async function folderPlsParentId(token: string): Promise<string | undefined> {
  const folder = await findFolderPlsInRoot(token).catch(() => null);
  return folder?.id;
}

export function DriveAutoBackupProvider({ children }: { children: ReactNode }) {
  const { loading, accessToken, getValidGrant, markTokenExpired } = useDriveSession();
  const activeStoreKey = useActiveStoreKey();
  const [engine] = useState(
    () =>
      new DriveAutoBackup({
        getStore: getAccountStore,
        // Jeton yalnız açık deponun hesabına aitse verilir; değilse yedek yazılmaz.
        getBinding: () => {
          const storeKey = getActiveStoreKey();
          const grant = getValidGrant();
          return { storeKey, token: grant?.storeKey && grant.storeKey === storeKey ? grant.accessToken : null };
        },
        onAuthError: markTokenExpired,
        resolveParentId: folderPlsParentId,
        getPickedFileIds: readPickedFileIds,
      })
  );

  useEffect(() => engine.start(), [engine]);

  useEffect(() => {
    if (!loading) engine.refresh();
  }, [engine, loading, accessToken, activeStoreKey]);

  return <DriveAutoBackupContext.Provider value={engine}>{children}</DriveAutoBackupContext.Provider>;
}

export interface DriveAutoBackupControls extends AutoBackupView {
  syncNow: DriveAutoBackup["syncNow"];
  pause: DriveAutoBackup["pause"];
  resume: DriveAutoBackup["resume"];
}

export function useDriveAutoBackup(): DriveAutoBackupControls {
  const engine = useContext(DriveAutoBackupContext);
  if (engine === undefined) throw new Error("useDriveAutoBackup must be used within a DriveAutoBackupProvider");
  const view = useSyncExternalStore(engine.subscribe, engine.getView, engine.getView);
  return { ...view, syncNow: engine.syncNow, pause: engine.pause, resume: engine.resume };
}
