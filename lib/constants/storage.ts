/**
 * Storage & Token Constants
 *
 * Centralized constants for local storage keys and token management.
 */

/**
 * SessionStorage key for the Drive access token (never localStorage)
 */
export const TOKEN_STORAGE_KEY = "folderpls_drive_token";

/**
 * LocalStorage key for user locale preference
 */
export const LOCALE_STORAGE_KEY = "folderpls_locale";

/** LocalStorage: bağlı Google hesabı (e-posta, ad); yalnız "yeniden bağlan" için. */
export const DRIVE_ACCOUNT_STORAGE_KEY = "folderpls_drive_account";

/** LocalStorage: Drive yedeğinin durumu (bekleyen değişiklik sayacı, son yedek zamanı). Etiket verisi içermez. */
export const DRIVE_BACKUP_STATE_STORAGE_KEY = "folderpls_drive_backup";

/** LocalStorage: Drive'daki FolderPls kök klasörünün kimliği. */
export const DRIVE_ROOT_FOLDER_STORAGE_KEY = "folderpls_root_folder";

/** LocalStorage: açık etiket deposunun anahtarı (Google hesap kimliğinin özeti; e-posta değil). */
export const ACTIVE_LABEL_STORE_STORAGE_KEY = "folderpls_active_store";

/** LocalStorage: eski tek depodan hesap deposuna bir kerelik taşımanın durumu. Etiket verisi içermez. */
export const LEGACY_STORE_MIGRATION_STORAGE_KEY = "folderpls_store_migration";

/** LocalStorage: Picker'da seçilmiş, yedekle aynı adlı dosyaların kimlikleri; eski yedek sanılmasınlar. */
export const PICKED_BACKUP_NAMES_STORAGE_KEY = "folderpls_picked_backup_ids";
