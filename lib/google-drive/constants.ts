/**
 * Google Drive API Constants
 */

/**
 * Yalnız `drive.file`: uygulamanın oluşturduğu ya da Picker ile seçilen dosyalar.
 * Daha geniş kapsamlar Google'ın ücretli güvenlik incelemesini gerektirir ve bu
 * ürün için bilinçli olarak kullanılmaz.
 */
export const DRIVE_SCOPES = {
  FILE_ONLY: "https://www.googleapis.com/auth/drive.file",
};

export function getDriveScopes(): string {
  return DRIVE_SCOPES.FILE_ONLY;
}
