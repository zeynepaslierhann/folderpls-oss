/**
 * Google Picker API Integration
 *
 * Google Picker allows users to select files from their Drive without requiring
 * broad Drive access scopes. When a user picks a file through the Picker,
 * the app gains access to that specific file via the drive.file scope.
 *
 * This approach is Google-recommended and does NOT require OAuth verification.
 *
 * Documentation: https://developers.google.com/picker/docs
 */

// Import consolidated Google API types
import "@/lib/google-drive/google-types";
import { PICKER_SCRIPT_URL } from "@/lib/constants";
import type { PickerCallbackData, PickerDocument } from "@/lib/google-drive/google-types";

export type { PickerDocument };

let isGapiLoaded = false;
let isPickerLoaded = false;

/**
 * Load the Google API client library
 */
function loadGapiScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("No window object"));
  }

  if (isGapiLoaded && window.gapi) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PICKER_SCRIPT_URL}"]`);

    if (existing) {
      if (window.gapi) {
        isGapiLoaded = true;
        resolve();
      } else {
        existing.addEventListener("load", () => {
          isGapiLoaded = true;
          resolve();
        });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = PICKER_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      isGapiLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Google API script"));
    document.head.appendChild(script);
  });
}

/**
 * Load the Picker API
 */
function loadPickerApi(): Promise<void> {
  if (isPickerLoaded && window.google?.picker) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    if (!window.gapi) {
      reject(new Error("GAPI not loaded"));
      return;
    }

    window.gapi.load("picker", () => {
      if (window.google?.picker) {
        isPickerLoaded = true;
        resolve();
      } else {
        reject(new Error("Failed to load Picker API"));
      }
    });
  });
}

/**
 * API key for Google Picker. Prefer NEXT_PUBLIC_GOOGLE_API_KEY (GCP API key with
 * Picker API enabled).
 */
export function getPickerApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";
}

export interface PickerConfig {
  accessToken: string;
  apiKey: string;
  appId?: string;
  multiSelect?: boolean;
  includeFolders?: boolean;
  selectFolderEnabled?: boolean;
  parentFolderId?: string;
  mimeTypes?: string[];
  title?: string;
  locale?: string;
}

/**
 * DocsView.setEnableDrives exists in the Picker runtime but is not in our shared
 * type declarations (google-types.ts is a protected path), so it is feature-detected here.
 */
export function enableDrivesOnView(view: object): void {
  const v = view as { setEnableDrives?: (enabled: boolean) => unknown };
  if (typeof v.setEnableDrives === "function") v.setEnableDrives(true);
}

/**
 * Open the Google Picker to let user select files from their Drive.
 * This works with drive.file scope and doesn't require OAuth verification.
 */
export async function openPicker(config: PickerConfig): Promise<PickerDocument[]> {
  await loadGapiScript();
  await loadPickerApi();

  const picker = window.google?.picker;
  if (!picker) {
    throw new Error("Picker API not available");
  }

  return new Promise((resolve, reject) => {
    try {
      // Create a view for all documents
      const docsView = new picker.DocsView(picker.ViewId.DOCS);

      if (config.includeFolders !== false) {
        docsView.setIncludeFolders(true);
      }

      if (config.selectFolderEnabled) {
        docsView.setSelectFolderEnabled(true);
      }

      // Start from My Drive root when no parent specified (clear scope for drive.file)
      docsView.setParent(config.parentFolderId || "root");

      // Shared drives: SUPPORT_DRIVES alone is not enough; the view must opt in too.
      enableDrivesOnView(docsView);

      if (config.mimeTypes && config.mimeTypes.length > 0) {
        docsView.setMimeTypes(config.mimeTypes.join(","));
      }

      // Build the picker
      const pickerBuilder = new picker.PickerBuilder().addView(docsView);

      // Root view above only lists My Drive: add a second view that exposes shared drives.
      if (!config.parentFolderId) {
        const sharedView = new picker.DocsView(picker.ViewId.DOCS);
        if (config.includeFolders !== false) sharedView.setIncludeFolders(true);
        if (config.selectFolderEnabled) sharedView.setSelectFolderEnabled(true);
        if (config.mimeTypes && config.mimeTypes.length > 0) {
          sharedView.setMimeTypes(config.mimeTypes.join(","));
        }
        enableDrivesOnView(sharedView);
        pickerBuilder.addView(sharedView);
      }

      pickerBuilder
        .setOAuthToken(config.accessToken)
        .setDeveloperKey(config.apiKey)
        .setCallback((data: PickerCallbackData) => {
          if (data.action === picker.Action.PICKED && data.docs) {
            resolve(data.docs);
          } else if (data.action === picker.Action.CANCEL) {
            resolve([]);
          }
        });

      // Enable features
      if (config.multiSelect) {
        pickerBuilder.enableFeature(picker.Feature.MULTISELECT_ENABLED);
      }

      // Support shared drives
      pickerBuilder.enableFeature(picker.Feature.SUPPORT_DRIVES);

      if (config.appId) {
        pickerBuilder.setAppId(config.appId);
      }

      if (config.title) {
        pickerBuilder.setTitle(config.title);
      }

      if (config.locale) {
        pickerBuilder.setLocale(config.locale);
      }

      // Set origin for security
      if (typeof window !== "undefined") {
        pickerBuilder.setOrigin(window.location.origin);
      }

      const pickerInstance = pickerBuilder.build();
      pickerInstance.setVisible(true);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Picker restricted to folders. Multi-select is on unless the caller turns it off;
 * cancelling resolves with no documents.
 */
export async function openFolderPicker({
  multiSelect = true,
  ...options
}: Omit<PickerConfig, "selectFolderEnabled">): Promise<PickerDocument[]> {
  return openPicker({
    ...options,
    multiSelect,
    selectFolderEnabled: true,
    mimeTypes: ["application/vnd.google-apps.folder"],
  });
}
