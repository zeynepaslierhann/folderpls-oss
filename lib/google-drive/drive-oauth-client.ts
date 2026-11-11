// Google Drive bağlantısı: tarayıcıda Google Identity Services token akışı.
// Sunucu yok: erişim jetonu yalnız bu sekmede durur, yenileme jetonu hiç alınmaz.
// Jetonun süresi dolunca Google kullanıcıdan bir tıklama ister (bkz. drive-session).
import "@/lib/google-drive/google-types";
import { GIS_SCRIPT_URL } from "@/lib/constants";
import { getDriveScopes } from "./constants";

function isLoaded(): boolean {
  return typeof window.google?.accounts?.oauth2?.initTokenClient === "function";
}

function settledBy(script: Element): Promise<void> {
  return new Promise((resolve, reject) => {
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services")));
  });
}

/**
 * Betiği önceden yükler. Bağlanma düğmesine basıldığında betik hazır olmalı:
 * tıklama ile pencere açılışı arasına ağ beklemesi girerse tarayıcı açılır pencereyi engeller.
 */
export async function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === "undefined") throw new Error("No window");
  if (isLoaded()) return;

  const existing = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`);
  if (existing) return settledBy(existing);

  const tag = Object.assign(document.createElement("script"), { src: GIS_SCRIPT_URL, async: true });
  const settled = settledBy(tag);
  document.head.appendChild(tag);
  return settled;
}

export interface DriveTokenGrant {
  accessToken: string;
  /** Epoch ms. */
  expiresAt: number;
}

export interface DriveTokenRequest {
  clientId: string;
  /** Boş: daha önce onay verildiyse yeniden sormaz. `select_account`: hesap seçtirir. */
  prompt?: "" | "select_account" | "consent";
  /** Önceki bağlantının e-postası. */
  hint?: string;
  now?: () => number;
}

const DEFAULT_TOKEN_LIFETIME_SECONDS = 3600;

export async function requestDriveToken({ clientId, prompt = "", hint, now = Date.now }: DriveTokenRequest): Promise<DriveTokenGrant> {
  await loadGoogleIdentityServices();

  return new Promise<DriveTokenGrant>((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      reject(new Error("Google Identity Services not loaded"));
      return;
    }
    const scope = getDriveScopes();
    const client = oauth2.initTokenClient({
      scope,
      client_id: clientId,
      ...(hint ? { hint } : {}),
      // Pencere kapatıldıysa ya da açılamadıysa `callback` hiç çağrılmaz; bağlanıyor durumu asılı kalmasın.
      error_callback: (err) => reject(new Error(`drive_consent_${err?.type ?? "failed"}`)),
      callback: (response) => {
        if (!response.access_token) {
          reject(new Error(`drive_consent_${response.error ?? "no_token"}`));
          return;
        }
        // Kullanıcı onay ekranında kutuyu kaldırdıysa jeton Drive'a yaramaz.
        if (response.scope !== undefined && !response.scope.split(" ").includes(scope)) {
          reject(new Error("drive_consent_scope_not_granted"));
          return;
        }
        const seconds = Number(response.expires_in) || DEFAULT_TOKEN_LIFETIME_SECONDS;
        resolve({ accessToken: response.access_token, expiresAt: now() + seconds * 1000 });
      },
    });
    client.requestAccessToken({ prompt });
  });
}

/** Google tarafındaki izni geri alır. Hata verse de yerel bağlantı kesilir. */
export function revokeDriveToken(accessToken: string): Promise<void> {
  return loadGoogleIdentityServices()
    .then(
      () =>
        new Promise<void>((resolve) => {
          const oauth2 = window.google?.accounts?.oauth2;
          if (!oauth2) {
            resolve();
            return;
          }
          oauth2.revoke(accessToken, () => resolve());
        })
    )
    .catch(() => undefined);
}
