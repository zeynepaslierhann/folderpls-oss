import { afterEach, describe, expect, it, vi } from "vitest";
import { requestDriveToken, revokeDriveToken } from "@/lib/google-drive/drive-oauth-client";
import { DRIVE_SCOPES } from "@/lib/google-drive/constants";

type Config = {
  scope: string;
  hint?: string;
  callback: (r: { access_token?: string; expires_in?: number; scope?: string; error?: string }) => void;
  error_callback?: (e: { type: string }) => void;
};

function installGis() {
  const requestAccessToken = vi.fn();
  const revoke = vi.fn((_token: string, done?: () => void) => done?.());
  let config: Config | undefined;
  vi.stubGlobal("window", {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (c: Config) => {
            config = c;
            return { requestAccessToken };
          },
          revoke,
        },
      },
    },
  });
  return { requestAccessToken, revoke, config: () => config! };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => vi.unstubAllGlobals());

describe("requestDriveToken", () => {
  it("yalnız drive.file ister, sunucuya gitmez ve bitiş anını hesaplar", async () => {
    const gis = installGis();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const pending = requestDriveToken({ clientId: "id", now: () => 1000 });
    await flush();
    expect(gis.config().scope).toBe(DRIVE_SCOPES.FILE_ONLY);
    expect(gis.requestAccessToken).toHaveBeenCalledWith({ prompt: "" });
    gis.config().callback({ access_token: "tok", expires_in: 3600, scope: DRIVE_SCOPES.FILE_ONLY });
    await expect(pending).resolves.toEqual({ accessToken: "tok", expiresAt: 3_601_000 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("önceki hesabı ipucu olarak geçirir", async () => {
    const gis = installGis();
    void requestDriveToken({ clientId: "id", hint: "a@b.co", prompt: "select_account" }).catch(() => undefined);
    await flush();
    expect(gis.config().hint).toBe("a@b.co");
    expect(gis.requestAccessToken).toHaveBeenCalledWith({ prompt: "select_account" });
  });

  it("Google ekranında reddedilirse jetonsuz yanıt hata olur", async () => {
    const gis = installGis();
    const pending = requestDriveToken({ clientId: "id" });
    await flush();
    gis.config().callback({ error: "access_denied" });
    await expect(pending).rejects.toThrow("drive_consent_access_denied");
  });

  it("onay ekranında kapsam kaldırıldıysa jeton kabul edilmez", async () => {
    const gis = installGis();
    const pending = requestDriveToken({ clientId: "id" });
    await flush();
    gis.config().callback({ access_token: "tok", scope: "openid" });
    await expect(pending).rejects.toThrow("drive_consent_scope_not_granted");
  });

  it("pencere kapatılırsa söz asılı kalmaz", async () => {
    const gis = installGis();
    const pending = requestDriveToken({ clientId: "id" });
    await flush();
    gis.config().error_callback?.({ type: "popup_closed" });
    await expect(pending).rejects.toThrow("drive_consent_popup_closed");
  });
});

describe("requestDriveToken engellenen pencere", () => {
  it("GIS popup_failed_to_open hatası türüyle döner", async () => {
    const gis = installGis();
    const pending = requestDriveToken({ clientId: "id" });
    await flush();
    gis.config().error_callback?.({ type: "popup_failed_to_open" });
    await expect(pending).rejects.toThrow("drive_consent_popup_failed_to_open");
  });
});

describe("revokeDriveToken", () => {
  it("izni Google tarafında geri alır", async () => {
    const gis = installGis();
    await revokeDriveToken("tok");
    expect(gis.revoke).toHaveBeenCalledWith("tok", expect.any(Function));
  });
});
