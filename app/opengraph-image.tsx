import { ImageResponse } from "next/og";
import { loadBrandLogoDataUri } from "@/lib/seo/brand-og";

// 1200x630 social card for every route (file-based metadata). Replaces the
// 334x269 logo that was declared as a 1200x630 og:image.
export const alt = "FolderPls — organize Google Drive with tags, without moving files";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logo = await loadBrandLogoDataUri();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#F3EECE",
          color: "#2a2a2a",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={logo} alt="" width={70} height={56} />
          <div style={{ fontSize: 44, fontWeight: 700 }}>FolderPls</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            Tag your Google Drive files.
          </div>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, color: "#3e5f88" }}>
            Find them instantly.
          </div>
        </div>
        <div style={{ fontSize: 30, color: "#4a4a3a" }}>
          Labels, notes and filters on top of Drive — no files moved.
        </div>
      </div>
    ),
    size,
  );
}
