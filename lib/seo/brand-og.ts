import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND_LOGO_SRC } from "@/lib/brand";

/** Sosyal kartlar (derleme anında üretilir) ana sayfa logosunu veri adresi olarak gömer. */
export async function loadBrandLogoDataUri(): Promise<string> {
  const logo = await readFile(join(process.cwd(), "public", BRAND_LOGO_SRC));
  return `data:image/png;base64,${logo.toString("base64")}`;
}
