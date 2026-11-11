"use client";

import { useState } from "react";

type DriveImageProps = {
  src: string;
  alt: string;
  /** Unused: thumbnails load without auth. Callers may still pass it. */
  accessToken?: string;
  className?: string;
  fallback?: React.ReactNode;
};

type LoadState = "pending" | "ready" | "failed";

export function DriveImage(props: DriveImageProps) {
  const { src, alt, className, fallback } = props;
  const [loadState, setLoadState] = useState<LoadState>("pending");

  const isUnavailable = loadState === "failed" || !src;
  if (isUnavailable) return fallback ? <>{fallback}</> : null;

  const isPending = loadState === "pending";

  return (
    <>
      {isPending && fallback}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={alt}
        src={src}
        referrerPolicy="no-referrer"
        className={[className, isPending && "hidden"].filter(Boolean).join(" ")}
        onError={() => setLoadState("failed")}
        onLoad={() => setLoadState("ready")}
      />
    </>
  );
}
