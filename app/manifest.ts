import type { MetadataRoute } from "next";
import manifestJson from "@/public/manifest.json";

/**
 * Web uygulama manifesti — `/manifest.webmanifest` (Next, bu dosyayı otomatik
 * <link rel="manifest"> olarak bağlar). Tek veri kaynağı public/manifest.json;
 * eski `/manifest.json` adresi de çalışmaya devam eder.
 */
export default function manifest(): MetadataRoute.Manifest {
  return manifestJson as MetadataRoute.Manifest;
}
