import { ImageResponse } from "next/og";
import { BLOG_POSTS, getPostBySlug } from "@/lib/blog/posts";
import { BLOG_OG_SIZE, ogMeta, ogTitle, ogTitleFontSize } from "@/lib/seo/blog-og";
import { loadBrandLogoDataUri } from "@/lib/seo/brand-og";

// YAZIYA ÖZGÜ 1200x630 sosyal kart: başlık kartta görünür (eskiden her yazı kök kartı kullanıyordu).
// Kök kartla (app/opengraph-image.tsx) aynı renk ve yerleşim dili. Dosya kuralı (opengraph-image.tsx)
// yerine rota işleyicisi: dosya kuralı dinamik segmentte adrese özdeşlik eki ("opengraph-image-<hash>")
// koyar, JSON-LD `image` alanına yazılacak sabit adres bilinemez. Burada adres sabit: /blog/<slug>/og.png.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return new Response("Not found", { status: 404 });

  const title = ogTitle(post.title);
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
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (Satori) next/image çizemez */}
          <img src={logo} alt="" width={70} height={56} />
          <div style={{ fontSize: 44, fontWeight: 700 }}>FolderPls</div>
          <div style={{ fontSize: 30, color: "#3e5f88", marginLeft: 12 }}>Blog</div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: ogTitleFontSize(title),
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: -1.5,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#4a4a3a" }}>{ogMeta(post.readingMinutes, post.date)}</div>
      </div>
    ),
    BLOG_OG_SIZE,
  );
}
