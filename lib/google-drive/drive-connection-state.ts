/**
 * Drive bağlantısının tarayıcıda saklanan hali. Jeton yalnız sekmeye özel
 * sessionStorage'da durur, ait olduğu hesabın depo anahtarıyla birlikte: yedek
 * yalnız jetonun hesabıyla aynı depodan yazılır. localStorage'da yalnız kök klasör
 * kimliği ve bağlı hesabın e-postası, adı ve depo anahtarı tutulur; böylece yeni
 * sekmede "yeniden bağlan" denebilir.
 */
import { DRIVE_ACCOUNT_STORAGE_KEY, DRIVE_ROOT_FOLDER_STORAGE_KEY, TOKEN_STORAGE_KEY } from "@/lib/constants";
import { isStoreKey } from "@/lib/storage/account-stores";
import type { DriveTokenGrant } from "./drive-oauth-client";
import type { DriveAccount } from "./api/storage";

/** Sekmedeki jeton ve ait olduğu hesabın deposu. Depo anahtarı yoksa hesap henüz okunmadı. */
export type StoredDriveGrant = DriveTokenGrant & { storeKey?: string };

export type DriveConnectionStatus = "disconnected" | "connected" | "expired";

/** Kullanıcının görmesi gereken bağlantı sorunu. Kendi vazgeçtiyse sorun yoktur. */
export type DriveConnectIssue = "popup_blocked" | "failed";

/** Süresi birazdan dolacak jeton istekte reddedilmesin diye erken bırakılır. */
export const TOKEN_EXPIRY_MARGIN_MS = 60_000;

export function isGrantUsable<T extends DriveTokenGrant>(grant: T | null, now: number): grant is T {
  return !!grant && grant.expiresAt - TOKEN_EXPIRY_MARGIN_MS > now;
}

export function initialDriveStatus(grant: DriveTokenGrant | null, account: DriveAccount | null, now: number): DriveConnectionStatus {
  if (isGrantUsable(grant, now)) return "connected";
  return account ? "expired" : "disconnected";
}

function safely<T>(read: () => T, fallback: T): T {
  try {
    return read();
  } catch {
    return fallback;
  }
}

export function parseStoredGrant(raw: string | null): StoredDriveGrant | null {
  if (!raw) return null;
  return safely(() => {
    const parsed = JSON.parse(raw) as Partial<StoredDriveGrant>;
    if (typeof parsed.accessToken !== "string" || typeof parsed.expiresAt !== "number") return null;
    const grant: StoredDriveGrant = { accessToken: parsed.accessToken, expiresAt: parsed.expiresAt };
    if (isStoreKey(parsed.storeKey)) grant.storeKey = parsed.storeKey;
    return grant;
  }, null);
}

export function parseStoredAccount(raw: string | null): DriveAccount | null {
  if (!raw) return null;
  return safely(() => {
    const parsed = JSON.parse(raw) as Partial<DriveAccount>;
    if (typeof parsed.email !== "string" && typeof parsed.displayName !== "string") return null;
    const account: DriveAccount = { email: parsed.email ?? null, displayName: parsed.displayName ?? null };
    if (isStoreKey(parsed.storeKey)) account.storeKey = parsed.storeKey;
    return account;
  }, null);
}

export const readStoredGrant = () => safely(() => parseStoredGrant(sessionStorage.getItem(TOKEN_STORAGE_KEY)), null);
export const writeStoredGrant = (grant: StoredDriveGrant) =>
  safely(() => sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(grant)), undefined);
export const clearStoredGrant = () => safely(() => sessionStorage.removeItem(TOKEN_STORAGE_KEY), undefined);

export const readStoredAccount = () => safely(() => parseStoredAccount(localStorage.getItem(DRIVE_ACCOUNT_STORAGE_KEY)), null);
export const writeStoredAccount = (account: DriveAccount) =>
  safely(() => localStorage.setItem(DRIVE_ACCOUNT_STORAGE_KEY, JSON.stringify(account)), undefined);
export const clearStoredAccount = () => safely(() => localStorage.removeItem(DRIVE_ACCOUNT_STORAGE_KEY), undefined);

export const getStoredRootFolderId = () => safely(() => localStorage.getItem(DRIVE_ROOT_FOLDER_STORAGE_KEY), null);
export const setStoredRootFolderId = (folderId: string) =>
  safely(() => localStorage.setItem(DRIVE_ROOT_FOLDER_STORAGE_KEY, folderId), undefined);
export const clearStoredRootFolderId = () => safely(() => localStorage.removeItem(DRIVE_ROOT_FOLDER_STORAGE_KEY), undefined);

/** GIS hatasını sınıflar; `null` kullanıcının bilerek vazgeçtiği anlamına gelir. */
export function driveConnectIssue(err: unknown): DriveConnectIssue | null {
  const message = err instanceof Error ? err.message : "";
  if (message === "drive_consent_popup_failed_to_open") return "popup_blocked";
  if (message === "drive_consent_popup_closed" || message === "drive_consent_access_denied") return null;
  return "failed";
}

/** Drive REST yalnız geçersiz ya da süresi dolmuş jetonda 401 döner; 403 kota ya da izin hatasıdır. */
export function isDriveAuthError(err: unknown): boolean {
  if ((err as { code?: unknown } | null)?.code === 401) return true;
  return err instanceof Error && /\(401\)/.test(err.message);
}
