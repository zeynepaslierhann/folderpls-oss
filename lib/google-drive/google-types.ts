/**
 * Google API Type Definitions
 *
 * Consolidated type definitions for Google Identity Services (GIS)
 * and Google Picker API to avoid Window interface conflicts.
 */

export { };

export interface PickerCallbackData {
  action: string;
  docs?: PickerDocument[];
}

export interface PickerDocument {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  iconUrl?: string;
  parentId?: string;
  serviceId?: string;
  type?: string;
  lastEditedUtc?: number;
  sizeBytes?: number;
}

declare global {
  // Google Identity Services (OAuth)
  interface GoogleOAuth2 {
    initTokenClient: (config: {
      client_id: string;
      scope: string;
      /** Hesap ipucu (e-posta): yeniden bağlanmada hesap seçiciyi kısaltır. */
      hint?: string;
      prompt?: string;
      /** Kullanıcı reddederse `access_token` yoktur, `error` dolu gelir. */
      callback: (response: {
        access_token?: string;
        expires_in?: number | string;
        scope?: string;
        error?: string;
      }) => void;
      /** Pencere kapatıldı ya da açılamadı: onay ekranına hiç ulaşılamayan durumlar. */
      error_callback?: (error: { type: string }) => void;
    }) => { requestAccessToken: (overrides?: { prompt?: string; hint?: string }) => void };
    revoke: (token: string, done?: () => void) => void;
  }

  // Google Picker Namespace
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace google.picker {
    enum Action {
      CANCEL = 'cancel',
      PICKED = 'picked'
    }

    enum ViewId {
      DOCS = 'docs',
      DOCS_IMAGES = 'docs-images',
      DOCS_IMAGES_AND_VIDEOS = 'docs-images-and-videos',
      DOCS_VIDEOS = 'docs-videos',
      DOCUMENTS = 'documents',
      DRAWINGS = 'drawings',
      FOLDERS = 'folders',
      FORMS = 'forms',
      IMAGE_SEARCH = 'image-search',
      MAPS = 'maps',
      PDFS = 'pdfs',
      PHOTOS = 'photos',
      PHOTO_ALBUMS = 'photo-albums',
      PRESENTATIONS = 'presentations',
      RECENTLY_PICKED = 'recently-picked',
      SPREADSHEETS = 'spreadsheets',
      VIDEO_SEARCH = 'video-search',
      WEBCAM = 'webcam',
      YOUTUBE = 'youtube'
    }

    enum Feature {
      MULTISELECT_ENABLED = 'multiSelectEnabled',
      NAV_HIDDEN = 'navHidden',
      SIMPLE_UPLOAD_ENABLED = 'simpleUploadEnabled',
      SUPPORT_DRIVES = 'supportDrives',
      SUPPORT_TEAM_DRIVES = 'supportTeamDrives',
      MINE_ONLY = 'mineOnly',
    }

    class PickerBuilder {
      addView(viewOrId: View | DocsView | ViewId): PickerBuilder;
      addViewGroup(viewGroup: View | DocsView): PickerBuilder;
      disableFeature(feature: string): PickerBuilder;
      enableFeature(feature: string): PickerBuilder;
      getRelayUrl(): string;
      getTitle(): string;
      setAppId(appId: string): PickerBuilder;
      setCallback(callback: (data: PickerCallbackData) => void): PickerBuilder;
      setDeveloperKey(key: string): PickerBuilder;
      setDocument(document: Document): PickerBuilder;
      setLocale(locale: string): PickerBuilder;
      setOAuthToken(token: string): PickerBuilder;
      setOrigin(origin: string): PickerBuilder;
      setRelayUrl(url: string): PickerBuilder;
      setSelectableMimeTypes(type: string): PickerBuilder;
      setSize(width: number, height: number): PickerBuilder;
      setTitle(title: string): PickerBuilder;
      setUploadToAlbumId(albumId: string): PickerBuilder;
      build(): Picker;
    }

    class Picker {
      isVisible(): boolean;
      setCallback(callback: (data: PickerCallbackData) => void): Picker;
      setRelayUrl(url: string): Picker;
      setVisible(visible: boolean): void;
    }

    class View {
      constructor(viewId: ViewId);
      bind(element: string, type: string, onSelect: (data: PickerCallbackData) => void): void;
      setMimeTypes(mimeTypes: string): View;
    }

    class DocsView extends View {
      constructor(viewId?: ViewId);
      setIncludeFolders(include: boolean): DocsView;
      setSelectFolderEnabled(enabled: boolean): DocsView;
      setParent(parentId: string): DocsView;
      setMimeTypes(mimeTypes: string): DocsView;
      setMode(mode: string): DocsView;
      setOwnedByMe(owned: boolean): DocsView;
    }

    class DocsUploadView {
      constructor();
      setIncludeFolders(include: boolean): DocsUploadView;
      setParent(parentId: string): DocsUploadView;
    }
  }

  // Window Extension
  interface Window {
    gapi?: {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: { apiKey: string; discoveryDocs?: string[] }) => Promise<void>;
        getToken: () => { access_token: string } | null;
      };
    };
    google?: {
      accounts?: {
        oauth2: GoogleOAuth2;
      };
      picker?: typeof google.picker;
    };
  }
}
