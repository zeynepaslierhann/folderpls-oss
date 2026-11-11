import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearStoredRootFolderId,
  driveConnectIssue,
  getStoredRootFolderId,
  initialDriveStatus,
  isDriveAuthError,
  isGrantUsable,
  parseStoredAccount,
  parseStoredGrant,
  readStoredGrant,
  setStoredRootFolderId,
  TOKEN_EXPIRY_MARGIN_MS,
  writeStoredGrant,
} from "@/lib/google-drive/drive-connection-state";
import { createDriveError } from "@/lib/google-drive/helpers";

const NOW = 1_000_000;
const grant = (expiresAt: number) => ({ accessToken: "tok", expiresAt });
const account = { email: "a@b.co", displayName: null };

function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: () => null,
    length: 0,
  } as Storage;
}

beforeEach(() => {
  vi.stubGlobal("sessionStorage", fakeStorage());
  vi.stubGlobal("localStorage", fakeStorage());
});

describe("Drive bağlantı durumu", () => {
  it("süresi dolmak üzere olan jeton kullanılmaz", () => {
    expect(isGrantUsable(grant(NOW + TOKEN_EXPIRY_MARGIN_MS + 1), NOW)).toBe(true);
    expect(isGrantUsable(grant(NOW + TOKEN_EXPIRY_MARGIN_MS), NOW)).toBe(false);
    expect(isGrantUsable(null, NOW)).toBe(false);
  });

  it("hiç bağlanılmadıysa 'bağlı değil', önceden bağlandıysa 'süresi doldu' der", () => {
    expect(initialDriveStatus(null, null, NOW)).toBe("disconnected");
    expect(initialDriveStatus(null, account, NOW)).toBe("expired");
    expect(initialDriveStatus(grant(NOW - 1), account, NOW)).toBe("expired");
    expect(initialDriveStatus(grant(NOW + 3_600_000), account, NOW)).toBe("connected");
  });

  it("bozuk saklanmış değerler yok sayılır", () => {
    expect(parseStoredGrant("eski-duz-jeton")).toBeNull();
    expect(parseStoredGrant(JSON.stringify({ accessToken: "x" }))).toBeNull();
    expect(parseStoredAccount("{")).toBeNull();
    expect(parseStoredAccount(JSON.stringify(account))).toEqual(account);
  });

  it("jeton ve hesap kaydı depo anahtarını taşır; geçersiz anahtar ve kalıcı kimlik saklanmaz", () => {
    const storeKey = "c".repeat(32);
    expect(parseStoredGrant(JSON.stringify({ accessToken: "x", expiresAt: 1, storeKey }))).toEqual({ accessToken: "x", expiresAt: 1, storeKey });
    expect(parseStoredGrant(JSON.stringify({ accessToken: "x", expiresAt: 1, storeKey: "kisi@example.com" }))).toEqual({ accessToken: "x", expiresAt: 1 });
    expect(parseStoredAccount(JSON.stringify({ ...account, storeKey, permissionId: "123" }))).toEqual({ ...account, storeKey });
  });

  it("jeton sessionStorage'da kalır, localStorage'a yazılmaz", () => {
    writeStoredGrant(grant(NOW));
    expect(readStoredGrant()).toEqual(grant(NOW));
    expect(localStorage.getItem("folderpls_drive_token")).toBeNull();
  });

  it("kök klasör kimliği tarayıcıda saklanır", () => {
    expect(getStoredRootFolderId()).toBeNull();
    setStoredRootFolderId("abc");
    expect(getStoredRootFolderId()).toBe("abc");
    clearStoredRootFolderId();
    expect(getStoredRootFolderId()).toBeNull();
  });
});

describe("driveConnectIssue", () => {
  it("engellenen pencere kullanıcıya ayrı sorun olarak döner", () => {
    expect(driveConnectIssue(new Error("drive_consent_popup_failed_to_open"))).toBe("popup_blocked");
  });

  it("kullanıcı pencereyi kapatır ya da reddederse hata gösterilmez", () => {
    expect(driveConnectIssue(new Error("drive_consent_popup_closed"))).toBeNull();
    expect(driveConnectIssue(new Error("drive_consent_access_denied"))).toBeNull();
  });

  it("betik yüklenemezse ya da kapsam verilmezse genel hata olur", () => {
    expect(driveConnectIssue(new Error("Failed to load Google Identity Services"))).toBe("failed");
    expect(driveConnectIssue(new Error("drive_consent_scope_not_granted"))).toBe("failed");
  });
});

describe("isDriveAuthError", () => {
  it("yalnız 401 yeniden bağlanma ister; 403 ve ağ hatası istemez", () => {
    expect(isDriveAuthError(createDriveError("x", { error: { code: 401 } }))).toBe(true);
    expect(isDriveAuthError(new Error("Failed to read Drive backup (401)"))).toBe(true);
    expect(isDriveAuthError(createDriveError("x", { error: { code: 403 } }))).toBe(false);
    expect(isDriveAuthError(new TypeError("Failed to fetch"))).toBe(false);
    expect(isDriveAuthError(null)).toBe(false);
  });

  it("ham Drive hata metni kullanıcıya taşınmaz", () => {
    const err = createDriveError("Failed to fetch Drive files", { error: { code: 401, message: "secret detail" } });
    expect(err.message).toBe("Failed to fetch Drive files");
  });
});
