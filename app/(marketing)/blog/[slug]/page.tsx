import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ClockIcon } from "@/components/icons";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PostBody } from "@/components/blog/post-body";
import { PostCta } from "@/components/blog/post-cta";
import { TransitionLink } from "@/components/motion/transition-link";
import { BLOG_POSTS, getPostBySlug } from "@/lib/blog/posts";
import { formatIsoDate } from "@/lib/utils/date";
import { SITE_URL } from "@/lib/constants/site";
import { BLOG_OG_SIZE, blogOgImageUrl } from "@/lib/seo/blog-og";

export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  const url = `${SITE_URL}/blog/${post.slug}`;
  // <title> ve açıklama arama sonucunda kesilmesin diye kısa sürümleri kullanır (lib/seo/page-meta.ts).
  // seoTitle mutlaktır (" | FolderPls" eklenmez): hedef sorgu başlıkta kalsın.
  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.description;
  // Yazıya özgü kart (og.png rota işleyicisi): genel kartı paylaşmak her yazıyı aynı gösteriyordu.
  const image = { url: blogOgImageUrl(url), ...BLOG_OG_SIZE, alt: post.title };
  return {
    title: post.seoTitle ? { absolute: post.seoTitle } : post.title,
    description,
    keywords: post.tags,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      publishedTime: post.date,
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const url = `${SITE_URL}/blog/${post.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    mainEntityOfPage: url,
    url,
    image: blogOgImageUrl(url),
    author: { "@type": "Organization", name: "FolderPls", url: SITE_URL },
    publisher: { "@type": "Organization", name: "FolderPls", logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-512.png` } },
    keywords: post.tags.join(", "),
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };
  const faqLd = post.faq?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: post.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;
  // Aynı etiketi paylaşan yazılar önce; sayfa başına en çok 4 iç bağlantı (9 yazıda 8 kartlık liste gürültü olur).
  const shared = (p: (typeof BLOG_POSTS)[number]) => p.tags.filter((t) => post.tags.includes(t)).length;
  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug)
    .map((p, i) => ({ p, i }))
    .sort((a, b) => shared(b.p) - shared(a.p) || a.i - b.i)
    .slice(0, 4)
    .map(({ p }) => p);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <Navbar />
      <main id="main-content" className="flex-1" lang="en">
        <article className="container mx-auto max-w-3xl px-4 py-14 md:py-20">
          <TransitionLink
            href="/blog"
            className="group mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="h-4 w-4 transition-transform duration-[var(--motion-duration-base)] ease-motion-out group-hover:-translate-x-1" aria-hidden="true" />
            Blog
          </TransitionLink>
          <header className="mb-10">
            <div className="mb-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-brand-ocean/20 px-3 py-1 text-xs font-semibold text-brand-ocean-ink">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl md:leading-[1.1]">{post.title}</h1>
            <p className="mb-5 text-lg text-muted-foreground">{post.description}</p>
            <p className="flex items-center gap-3 text-sm text-muted-foreground">
              <time dateTime={post.date}>{formatIsoDate(post.date, "en")}</time>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {post.readingMinutes} min read
              </span>
            </p>
          </header>

          <PostBody post={post} />
        </article>

        <PostCta />

        <aside className="border-t border-border/60 bg-muted/20 py-14" aria-labelledby="related-heading">
          <div className="container mx-auto max-w-3xl px-4">
            <h2 id="related-heading" className="mb-6 text-xl font-bold">
              Keep reading
            </h2>
            <ul className="grid gap-4 md:grid-cols-2">
              {related.map((p, i) => (
                <li key={p.slug} className="reveal" style={{ "--reveal-i": i } as CSSProperties}>
                  <TransitionLink
                    href={`/blog/${p.slug}`}
                    className="motion-lift motion-spotlight block h-full rounded-2xl border border-border/70 bg-card/80 p-5"
                  >
                    <span className="mb-2 block font-semibold">{p.title}</span>
                    <span className="block text-sm text-muted-foreground">{p.description}</span>
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </main>
      <Footer />
    </div>
  );
}
