"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { logger } from "@/lib/logger";
import { accountStoreKey, activateAccountStore } from "@/lib/storage/account-stores";
import { getDriveAccount, type DriveAccount } from "./api/storage";
import {
  clearStoredAccount,
  clearStoredGrant,
  clearStoredRootFolderId,
  driveConnectIssue,
  initialDriveStatus,
  isGrantUsable,
  readStoredAccount,
  readStoredGrant,
  TOKEN_EXPIRY_MARGIN_MS,
  writeStoredAccount,
  writeStoredGrant,
  type DriveConnectIssue,
  type DriveConnectionStatus,
  type StoredDriveGrant,
} from "./drive-connection-state";
import { loadGoogleIdentityServices, requestDriveToken, revokeDriveToken } from "./drive-oauth-client";

export interface DriveSession {
  /** Sekmedeki jeton okunana kadar true; bu sırada "bağlı değil" gösterilmez. */
  loading: boolean;
  status: DriveConnectionStatus;
  accessToken: string | null;
  account: DriveAccount | null;
  /** Az önce başka bir Google hesabından bu hesaba geçildi; önceki hesabın etiketleri bu tarayıcıda kaldı. */
  accountSwitch: { email: string | null } | null;
  dismissAccountSwitch: () => void;
  /** Son bağlanma denemesinin kullanıcıya gösterilecek sorunu. */
  connectIssue: DriveConnectIssue | null;
  /** Yalnız kullanıcı tıklamasından çağrılmalı: Google penceresi açar. */
  connectDrive: () => Promise<string | null>;
  /** Geçerli jeton ya da null; pencere açmaz. */
  getValidToken: () => string | null;
  /** Geçerli jeton ve ait olduğu hesabın depo anahtarı; pencere açmaz. */
  getValidGrant: () => StoredDriveGrant | null;
  /** Drive 401 döndürdü: panel "yeniden bağlan" gösterir. */
  markTokenExpired: () => void;
  disconnectDrive: () => Promise<void>;
}

const DriveSessionContext = createContext<DriveSession | undefined>(undefined);

function clientId(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
}

/** Hesaplara ayrılmadan önce kaydedilmiş hesap (depo anahtarı yok): eski deponun olası sahibi. */
function legacyOwnerEmail(stored: DriveAccount | null): string | null {
  return stored && !stored.storeKey ? stored.email : null;
}

/**
 * Jetonun hesabını okur ve o hesabın deposunu açar (gerekirse eski depoyu taşır).
 * Bitmeden jeton yedeğe verilmez: yedek hiçbir an başka hesabın deposundan yazmaz.
 */
async function bindAccount(accessToken: string, previous: DriveAccount | null) {
  const info = await getDriveAccount(accessToken);
  if (!info.permissionId) throw new Error("Drive account has no permissionId");
  const storeKey = await accountStoreKey(info.permissionId);
  const result = await activateAccountStore(storeKey, { email: info.email, legacyOwnerEmail: legacyOwnerEmail(previous) });
  const account: DriveAccount = { email: info.email, displayName: info.displayName, storeKey };
  return { account, fromOtherAccount: result.fromOtherAccount };
}

export function DriveSessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [grant, setGrant] = useState<StoredDriveGrant | null>(null);
  const [status, setStatus] = useState<DriveConnectionStatus>("disconnected");
  const [account, setAccount] = useState<DriveAccount | null>(null);
  const [connectIssue, setConnectIssue] = useState<DriveConnectIssue | null>(null);
  const [accountSwitch, setAccountSwitch] = useState<{ email: string | null } | null>(null);
  const grantRef = useRef<StoredDriveGrant | null>(null);

  const applyGrant = useCallback((next: StoredDriveGrant | null) => {
    grantRef.current = next;
    setGrant(next);
  }, []);

  useEffect(() => {
    // Saklama alanları yalnız istemcide var; hidrasyon uyuşmazlığı olmasın diye etkiden sonra okunur.
    let cancelled = false;
    const restore = async () => {
      const stored = readStoredGrant();
      const storedAccount = readStoredAccount();
      const now = Date.now();
      const usable = isGrantUsable(stored, now) ? stored : null;
      if (!usable) clearStoredGrant();
      let grantNow = usable;
      let accountNow = storedAccount;
      if (usable) {
        try {
          if (usable.storeKey && storedAccount?.storeKey === usable.storeKey) {
            await activateAccountStore(usable.storeKey, { email: storedAccount.email });
          } else {
            // Jetonun hesabı bilinmiyor ya da başka sekme başka hesabı kaydetti: hesabı yeniden oku.
            const bound = await bindAccount(usable.accessToken, storedAccount);
            grantNow = { ...usable, storeKey: bound.account.storeKey };
            accountNow = bound.account;
            writeStoredGrant(grantNow);
            writeStoredAccount(bound.account);
          }
        } catch (err) {
          logger.warn("Could not open the Drive account's labels:", err);
          grantNow = { accessToken: usable.accessToken, expiresAt: usable.expiresAt };
        }
      }
      if (cancelled) return;
      setAccount(accountNow);
      setStatus(initialDriveStatus(grantNow, accountNow, Date.now()));
      applyGrant(grantNow);
      setLoading(false);
    };
    const timer = setTimeout(() => void restore(), 0);
    if (clientId()) void loadGoogleIdentityServices().catch((err) => logger.warn("GIS script failed to load:", err));
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [applyGrant]);

  const markTokenExpired = useCallback(() => {
    clearStoredGrant();
    applyGrant(null);
    setStatus("expired");
  }, [applyGrant]);

  // Süre dolduğunda istek başarısız olmadan önce bant görünsün.
  useEffect(() => {
    if (!grant) return;
    const delay = Math.max(grant.expiresAt - TOKEN_EXPIRY_MARGIN_MS - Date.now(), 0);
    const timer = setTimeout(markTokenExpired, delay);
    return () => clearTimeout(timer);
  }, [grant, markTokenExpired]);

  const getValidGrant = useCallback((): StoredDriveGrant | null => {
    const current = grantRef.current;
    if (isGrantUsable(current, Date.now())) return current;
    if (current) markTokenExpired();
    return null;
  }, [markTokenExpired]);

  const getValidToken = useCallback((): string | null => getValidGrant()?.accessToken ?? null, [getValidGrant]);

  const connectDrive = useCallback(async (): Promise<string | null> => {
    setConnectIssue(null);
    const id = clientId();
    if (!id) {
      logger.error("NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID is not set");
      setConnectIssue("failed");
      return null;
    }
    const previous = readStoredAccount();
    try {
      const next = await requestDriveToken({
        clientId: id,
        prompt: previous ? "" : "select_account",
        hint: previous?.email ?? undefined,
      });
      let bound: StoredDriveGrant = next;
      try {
        const result = await bindAccount(next.accessToken, previous);
        bound = { ...next, storeKey: result.account.storeKey };
        writeStoredAccount(result.account);
        setAccount(result.account);
        setAccountSwitch(result.fromOtherAccount ? { email: result.account.email } : null);
      } catch (err) {
        // Hesap okunamadı: dosyalar açılır ama yedek bu jetonla yazılmaz.
        logger.warn("Could not read Drive account:", err);
        setAccount(null);
      }
      writeStoredGrant(bound);
      applyGrant(bound);
      setStatus("connected");
      return next.accessToken;
    } catch (err) {
      logger.warn("Drive connection did not complete:", err);
      setConnectIssue(driveConnectIssue(err));
      return null;
    }
  }, [applyGrant]);

  const disconnectDrive = useCallback(async () => {
    const current = grantRef.current;
    clearStoredGrant();
    clearStoredAccount();
    clearStoredRootFolderId();
    applyGrant(null);
    setAccount(null);
    setAccountSwitch(null);
    setConnectIssue(null);
    setStatus("disconnected");
    if (current) await revokeDriveToken(current.accessToken);
  }, [applyGrant]);

  const dismissAccountSwitch = useCallback(() => setAccountSwitch(null), []);

  const value = useMemo<DriveSession>(
    () => ({
      loading,
      status,
      accessToken: grant?.accessToken ?? null,
      account,
      accountSwitch,
      dismissAccountSwitch,
      connectIssue,
      connectDrive,
      getValidToken,
      getValidGrant,
      markTokenExpired,
      disconnectDrive,
    }),
    [
      loading,
      status,
      grant,
      account,
      accountSwitch,
      dismissAccountSwitch,
      connectIssue,
      connectDrive,
      getValidToken,
      getValidGrant,
      markTokenExpired,
      disconnectDrive,
    ]
  );

  return <DriveSessionContext.Provider value={value}>{children}</DriveSessionContext.Provider>;
}

export function useDriveSession(): DriveSession {
  const context = useContext(DriveSessionContext);
  if (context === undefined) throw new Error("useDriveSession must be used within a DriveSessionProvider");
  return context;
}
