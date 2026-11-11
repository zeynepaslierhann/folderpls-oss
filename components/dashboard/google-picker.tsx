"use client";

import { useCallback, useState } from "react";
import { ImportIcon } from "@/components/icons";
import { Button, type ButtonProps } from "@/components/ui/button";
import { openPicker, getPickerApiKey } from "@/lib/google-drive/drive-picker";
import { DriveFile } from "@/lib/google-drive/google-drive";
import { logger } from "@/lib/logger";
import { useI18n } from "@/lib/i18n/i18n-context";
import { rememberPickedFiles } from "@/lib/storage/drive-backup";

/**
 * Google Picker'ı açan mantık (Ultra: "Select from Drive"). Hem New ▾
 * menüsündeki öğe hem boş durumdaki düğme aynı hook'u kullanır.
 */
export function useGooglePicker(accessToken: string, onSelect: (files: DriveFile[]) => void) {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);

  const open = useCallback(async () => {
    if (!accessToken) return;

    const apiKey = getPickerApiKey();
    if (!apiKey) {
      logger.error("Google Picker: API key not configured");
      alert(t("dashboard.panel.pickerConfigMissing"));
      return;
    }

    try {
      setIsLoading(true);
      const appId = process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER;
      const docs = await openPicker({
        accessToken,
        apiKey,
        ...(appId ? { appId } : {}),
        multiSelect: true,
        includeFolders: true,
        selectFolderEnabled: false,
        mimeTypes: [],
      });

      if (docs && docs.length > 0) {
        const files: DriveFile[] = docs.map((doc: { id: string; name: string; mimeType: string; url?: string; iconUrl?: string; parentId?: string; lastEditedUtc?: number; sizeBytes?: number }) => ({
          id: doc.id,
          name: doc.name,
          mimeType: doc.mimeType,
          webViewLink: doc.url,
          iconLink: doc.iconUrl,
          thumbnailLink: doc.iconUrl,
          parents: doc.parentId ? [doc.parentId] : [],
          createdTime: new Date().toISOString(),
          modifiedTime: new Date(doc.lastEditedUtc ?? Date.now()).toISOString(),
          size: doc.sizeBytes != null ? String(doc.sizeBytes) : undefined,
          shared: false,
        }));
        rememberPickedFiles(files);
        onSelect(files);
      }
    } catch (err) {
      logger.error("Failed to open Google Picker", err);
      alert(t("dashboard.panel.pickerOpenFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, onSelect, t]);

  return { open, isLoading };
}

interface GooglePickerProps {
  accessToken: string;
  onSelect: (files: DriveFile[]) => void;
  disabled?: boolean;
  variant?: ButtonProps["variant"];
}

export function GooglePicker({ accessToken, onSelect, disabled, variant = "secondary" }: GooglePickerProps) {
  const { t } = useI18n();
  const { open, isLoading } = useGooglePicker(accessToken, onSelect);
  return (
    <Button variant={variant} size="md" onClick={open} disabled={disabled} loading={isLoading} className="gap-2">
      <ImportIcon className="h-4 w-4" aria-hidden="true" />
      {t("dashboard.panel.pickFromDrive")}
    </Button>
  );
}
