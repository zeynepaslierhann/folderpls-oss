import type { CSSProperties } from "react";
import { ExternalLinkIcon, InfoIcon } from "@/components/icons";
import { TransitionLink } from "@/components/motion/transition-link";
import { parseInline, type BlogBlock, type BlogPost } from "@/lib/blog/posts";

function Inline({ text, post }: { text: string; post: BlogPost }) {
  const tokens = parseInline(text);
  return (
    <>
      {tokens.map((token, i) => {
        if (token.kind === "text") return <span key={i}>{token.value}</span>;
        if (token.kind === "code")
          return (
            <code key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">
              {token.value}
            </code>
          );
        if (token.kind === "link") {
          const internal = token.href.startsWith("/");
          return internal ? (
            <TransitionLink key={i} href={token.href} className="font-medium text-brand-ocean-ink underline underline-offset-4 hover:no-underline">
              {token.text}
            </TransitionLink>
          ) : (
            <a key={i} href={token.href} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-ocean-ink underline underline-offset-4">
              {token.text}
            </a>
          );
        }
        const n = post.sources.findIndex((s) => s.id === token.sourceId) + 1;
        return (
          <sup key={i} className="ml-0.5">
            <a href={`#source-${token.sourceId}`} className="text-brand-ocean-ink hover:underline" aria-label={`Source ${n}`}>
              [{n}]
            </a>
          </sup>
        );
      })}
    </>
  );
}

function Block({ block, post }: { block: BlogBlock; post: BlogPost }) {
  switch (block.type) {
    case "p":
      return (
        <p className="reveal">
          <Inline text={block.text} post={post} />
        </p>
      );
    case "h2":
      return (
        <h2 id={block.id} className="reveal reveal-soft scroll-mt-24 pt-4 text-2xl font-bold tracking-tight md:text-3xl">
          {block.text}
        </h2>
      );
    case "h3":
      return <h3 className="reveal text-xl font-semibold">{block.text}</h3>;
    case "ul":
    case "ol": {
      const List = block.type;
      return (
        <List className={`reveal space-y-2 pl-6 ${block.type === "ul" ? "list-disc" : "list-decimal"} marker:text-brand-ocean-ink`}>
          {block.items.map((item) => (
            <li key={item} className="pl-1">
              <Inline text={item} post={post} />
            </li>
          ))}
        </List>
      );
    }
    case "table":
      return (
        // Scrollable on phones: focusable + labelled so keyboard users can scroll it.
        <div
          className="reveal reveal-scale overflow-x-auto rounded-2xl border border-border/70 bg-card/70 shadow-sm"
          role="region"
          aria-label={block.caption}
          tabIndex={0}
        >
          <table className="w-full min-w-[32rem] text-left text-sm">
            <caption className="sr-only">{block.caption}</caption>
            <thead>
              <tr className="border-b border-border/70 bg-muted/40">
                {block.head.map((cell, i) => (
                  <th key={i} scope="col" className="px-4 py-3 font-semibold">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row[0]} className="border-b border-border/50 last:border-0">
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th key={i} scope="row" className="px-4 py-3 font-medium">
                        {cell}
                      </th>
                    ) : (
                      <td key={i} className="px-4 py-3 text-muted-foreground">
                        <Inline text={cell} post={post} />
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "pre":
      return (
        <pre
          className="reveal overflow-x-auto rounded-2xl border border-border/70 bg-muted/40 p-4 font-mono text-sm leading-relaxed"
          role="region"
          aria-label="Folder structure diagram"
          tabIndex={0}
        >
          {block.text}
        </pre>
      );
    case "callout":
      return (
        <aside className="reveal flex gap-3 rounded-2xl border border-brand-ocean/40 bg-brand-ocean/10 p-4 text-sm">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-ocean-ink" aria-hidden="true" />
          <p>
            <Inline text={block.text} post={post} />
          </p>
        </aside>
      );
  }
}

export function PostBody({ post }: { post: BlogPost }) {
  return (
    <div className="space-y-6 text-[17px] leading-relaxed text-foreground/90">
      {post.blocks.map((block, i) => (
        <Block key={i} block={block} post={post} />
      ))}

      {post.faq && post.faq.length > 0 && (
        <section aria-labelledby="faq-heading" className="reveal mt-12 border-t border-border/70 pt-8">
          <h2 id="faq-heading" className="mb-4 text-2xl font-bold tracking-tight">
            Frequently asked questions
          </h2>
          <dl className="space-y-5">
            {post.faq.map((item) => (
              <div key={item.q}>
                <dt className="font-semibold">{item.q}</dt>
                <dd className="mt-1 text-foreground/80">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section aria-labelledby="sources-heading" className="reveal mt-12 border-t border-border/70 pt-8">
        <h2 id="sources-heading" className="mb-4 text-lg font-semibold">
          Sources
        </h2>
        <ol className="space-y-2 text-sm text-muted-foreground">
          {post.sources.map((source, i) => (
            <li key={source.id} id={`source-${source.id}`} className="scroll-mt-24" style={{ "--reveal-i": i } as CSSProperties}>
              [{i + 1}]{" "}
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground">
                {source.title}
                <ExternalLinkIcon className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>{" "}
              , read on {source.accessed}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
