import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { ArrowRightIcon, ClockIcon } from "@/components/icons";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { TransitionLink } from "@/components/motion/transition-link";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { formatIsoDate } from "@/lib/utils/date";
import { SITE_URL } from "@/lib/constants/site";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/og";
import { PAGE_META } from "@/lib/seo/page-meta";

const siteUrl = SITE_URL;

export const metadata: Metadata = {
  title: PAGE_META.blog.title,
  description: PAGE_META.blog.description,
  keywords: [
    "google drive labels",
    "tag files google drive",
    "google drive labels personal account",
    "organize google drive without moving files",
    "google drive labels alternative",
    "find files in google drive",
  ],
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: PAGE_META.blog.ogTitle,
    description: PAGE_META.blog.ogDescription,
    url: `${siteUrl}/blog`,
  },
  alternates: {
    canonical: `${siteUrl}/blog`,
  },
};

export default function BlogPage() {
  // Öne çıkan: en geniş arama niyetli rehber ("how to tag files in Google Drive"); sıra BLOG_POSTS'ta kalır.
  const featured = BLOG_POSTS.find((p) => p.slug === "how-to-tag-files-in-google-drive") ?? BLOG_POSTS[0];
  const rest = BLOG_POSTS.filter((p) => p !== featured);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <Navbar />
      <main id="main-content" className="flex-1" lang="en">
        <div className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-brand-ocean/20 blur-[110px]"
          />
          <div className="container relative mx-auto max-w-5xl px-4 py-16 md:py-20">
            <header className="mb-12 max-w-2xl">
              <h1 className="motion-rise mb-4 text-4xl font-bold tracking-tight md:text-5xl">Blog</h1>
              <p className="text-lg text-muted-foreground">
                Practical guides to organizing Google Drive with tags — with sources, and honest about the trade-offs.
              </p>
            </header>

            {featured && (
              <TransitionLink
                href={`/blog/${featured.slug}`}
                className="motion-enter motion-lift motion-spotlight group mb-8 block rounded-3xl border border-border/70 bg-card/80 p-7 shadow-lg md:p-10"
                style={{ "--enter-i": 1 } as CSSProperties}
              >
                <span className="mb-3 inline-block rounded-full bg-brand-lemon/80 px-3 py-1 text-xs font-bold text-brand-dark">
                  {featured.tags[0]}
                </span>
                <h2 className="mb-3 text-2xl font-bold tracking-tight md:text-3xl">{featured.title}</h2>
                <p className="mb-5 max-w-2xl text-muted-foreground">{featured.description}</p>
                <span className="flex items-center gap-3 text-sm text-muted-foreground">
                  <time dateTime={featured.date}>{formatIsoDate(featured.date, "en")}</time>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {featured.readingMinutes} min read
                  </span>
                  <ArrowRightIcon
                    className="ml-auto h-5 w-5 text-brand-ocean-ink transition-transform duration-[var(--motion-duration-base)] ease-motion-out group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </TransitionLink>
            )}

            <ul className="grid gap-6 md:grid-cols-2">
              {rest.map((post, i) => (
                <li key={post.slug} className="motion-enter" style={{ "--enter-i": i + 2 } as CSSProperties}>
                  <TransitionLink
                    href={`/blog/${post.slug}`}
                    className="motion-lift motion-spotlight group flex h-full flex-col rounded-2xl border border-border/70 bg-card/80 p-6"
                  >
                    <span className="mb-3 inline-block w-fit rounded-full bg-brand-ocean/20 px-3 py-1 text-xs font-semibold text-brand-ocean-ink">
                      {post.tags[0]}
                    </span>
                    <h2 className="mb-2 text-xl font-bold">{post.title}</h2>
                    <p className="mb-4 flex-1 text-sm text-muted-foreground">{post.description}</p>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      <time dateTime={post.date}>{formatIsoDate(post.date, "en")}</time>
                      <span aria-hidden="true">·</span>
                      {post.readingMinutes} min read
                      <ArrowRightIcon
                        className="ml-auto h-4 w-4 text-brand-ocean-ink transition-transform duration-[var(--motion-duration-base)] ease-motion-out group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
