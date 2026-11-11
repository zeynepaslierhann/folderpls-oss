"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DriveFile, getVideoEmbedUrl, getFileLocationUrl } from "@/lib/google-drive/google-drive";
import { ExternalLinkIcon, DownloadIcon, FileIcon } from "@/components/icons";
import { FileTypeIcon } from "@/components/dashboard/file-item/file-type";
import { Spinner } from "@/components/ui/loading";
import { DriveImage } from "./drive-image";
import { useI18n } from "@/lib/i18n/i18n-context";

const STILL_FRAME = "flex min-h-[200px] max-h-[60vh] items-center justify-center overflow-hidden rounded-md bg-hover";
const STILL_FIT = "max-h-[60vh] max-w-full object-contain";

type PreviewPlan =
  | { kind: "thumbnail" | "image" | "embedded-video" | "video"; src: string }
  | { kind: "document" | "unsupported" };

function isHostedOnDrive(file: DriveFile) {
  return file.webViewLink?.includes("drive.google.com") ?? false;
}

function locationHref(file: DriveFile) {
  return getFileLocationUrl(file) || file.webViewLink;
}

function planPreview(file: DriveFile): PreviewPlan {
  const { mimeType, thumbnailLink, webContentLink, webViewLink } = file;
  const directLink = webContentLink || webViewLink;
  const onDrive = isHostedOnDrive(file);

  if (mimeType.startsWith("image/")) {
    if (thumbnailLink) {
      // Drive thumbnails are served at 220px unless a larger size is requested.
      return { kind: "thumbnail", src: onDrive ? thumbnailLink.replace("=s220", "=s800") : thumbnailLink };
    }
    if (directLink) return { kind: "image", src: directLink };
  }

  if (mimeType.startsWith("video/")) {
    if (onDrive) return { kind: "embedded-video", src: getVideoEmbedUrl(file) };
    if (directLink) return { kind: "video", src: directLink };
  }

  const isDocument = mimeType === "application/pdf" || mimeType.includes("google-apps");
  return isDocument && webViewLink ? { kind: "document" } : { kind: "unsupported" };
}

/** Renders nothing when the file has no address for this link. */
function ExternalLinkButton({
  href,
  icon: Icon,
  size,
  children,
}: {
  href: string | undefined;
  icon: React.ComponentType<{ className?: string }>;
  size?: React.ComponentProps<typeof Button>["size"];
  children: React.ReactNode;
}) {
  if (!href) return null;

  return (
    <Button asChild variant="secondary" size={size}>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <Icon className="w-4 h-4 mr-2" />
        {children}
      </a>
    </Button>
  );
}

// The dialog body unmounts on close, so this state starts over on every open.
function EmbeddedVideo({ src }: { src: string }) {
  const { t } = useI18n();
  const [hasLoaded, setHasLoaded] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-md bg-hover" style={{ minHeight: "400px" }}>
      {!hasLoaded && (
        <p role="status" className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-fg-2">
          <Spinner />
          {t("dashboard.videoLoading")}
        </p>
      )}
      <iframe
        className="w-full"
        src={src}
        style={{ maxHeight: "500px", height: "70vh" }}
        allowFullScreen
        allow="autoplay; encrypted-media"
        onLoad={() => setHasLoaded(true)}
      />
    </div>
  );
}

function PreviewNotice({
  file,
  iconClassName,
  children,
}: {
  file: DriveFile;
  iconClassName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-12 text-center">
      <div className="mb-3 inline-block">
        <FileTypeIcon file={file} className={iconClassName} />
      </div>
      {children}
    </div>
  );
}

function PreviewBody({ file, accessToken }: { file: DriveFile; accessToken: string }) {
  const { t } = useI18n();
  const plan = planPreview(file);

  switch (plan.kind) {
    case "thumbnail":
      return (
        <div className={STILL_FRAME}>
          <DriveImage
            accessToken={accessToken}
            alt={file.name}
            className={STILL_FIT}
            src={plan.src}
            fallback={
              <div className="py-8 text-center">
                <FileIcon className="mx-auto mb-2 h-8 w-8 text-fg-3" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">{t("dashboard.imageLoadError")}</p>
              </div>
            }
          />
        </div>
      );

    case "image":
      return (
        <div className={STILL_FRAME}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={file.name} className={STILL_FIT} src={plan.src} />
        </div>
      );

    case "embedded-video":
      return <EmbeddedVideo src={plan.src} />;

    case "video":
      return (
        <div className="relative overflow-hidden rounded-md bg-hover">
          <video className="h-auto max-h-[60vh] w-full bg-black" controls preload="metadata" src={plan.src} />
        </div>
      );

    case "document":
      return (
        <PreviewNotice file={file} iconClassName="h-8 w-8">
          <p className="mb-4 text-muted-foreground">{t("dashboard.viewInDriveMessage")}</p>
          <ExternalLinkButton href={locationHref(file)} icon={ExternalLinkIcon}>
            {t("dashboard.showInDrive")}
          </ExternalLinkButton>
        </PreviewNotice>
      );

    case "unsupported":
      return (
        <PreviewNotice file={file} iconClassName="h-8 w-8 text-fg-3">
          <p className="mb-2 font-medium">{file.name}</p>
          <p className="mb-4 text-sm text-muted-foreground">{t("dashboard.previewNotAvailable")}</p>
          <div className="flex justify-center gap-2">
            <ExternalLinkButton href={locationHref(file)} icon={ExternalLinkIcon}>
              {t("dashboard.showInDrive")}
            </ExternalLinkButton>
            <ExternalLinkButton href={file.webContentLink} icon={DownloadIcon}>
              {t("common.download")}
            </ExternalLinkButton>
          </div>
        </PreviewNotice>
      );
  }
}

function PreviewFooter({ file }: { file: DriveFile }) {
  const { t } = useI18n();
  const locationLabel = isHostedOnDrive(file) ? t("dashboard.showInDrive") : t("dashboard.openInOneDrive");

  return (
    <div className="mt-4 flex items-center justify-between border-t pt-4">
      <p className="text-sm text-muted-foreground">{file.mimeType}</p>
      <ExternalLinkButton href={locationHref(file)} icon={ExternalLinkIcon} size="sm">
        {locationLabel}
      </ExternalLinkButton>
    </div>
  );
}

interface FilePreviewProps {
  file: DriveFile | null;
  open: boolean;
  accessToken: string;
  onClose: () => void;
}

export function FilePreview({ file, open, onClose, accessToken }: FilePreviewProps) {
  const { t } = useI18n();
  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{file.name}</DialogTitle>
          <DialogDescription className="sr-only">{t("dialogs.filePreview.description")}</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <PreviewBody file={file} accessToken={accessToken} />
        </div>

        <PreviewFooter file={file} />
      </DialogContent>
    </Dialog>
  );
}
