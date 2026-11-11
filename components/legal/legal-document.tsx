import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import {
  LEGAL_LAST_UPDATED_ISO,
  type LegalBlock,
  type LegalDocumentContent,
} from "@/lib/legal/types";

const LINK_PATTERN = /(https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

/** Turns bare URLs and e-mail addresses in legal copy into links. */
function linkify(text: string): ReactNode[] {
  return text.split(LINK_PATTERN).map((part, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
    // Keep sentence punctuation outside the link target.
    const trailing = /[.,;:]+$/.exec(part)?.[0] ?? "";
    const target = trailing ? part.slice(0, -trailing.length) : part;
    const isEmail = !target.startsWith("http");
    return (
      <Fragment key={i}>
        <a
          href={isEmail ? `mailto:${target}` : target}
          className="font-medium text-foreground underline underline-offset-2 break-words hover:no-underline"
          {...(isEmail ? {} : { target: "_blank", rel: "noopener noreferrer" })}
        >
          {target}
        </a>
        {trailing}
      </Fragment>
    );
  });
}

function Block({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case "p":
      return <p className="text-muted-foreground mb-4">{linkify(block.text)}</p>;
    case "h3":
      return <h3 className="text-lg font-semibold mt-6 mb-3">{block.text}</h3>;
    case "ul":
      return (
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
          {block.items.map((item) => (
            <li key={item}>{linkify(item)}</li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <p className="mb-4 rounded-lg border-l-4 border-brand-ocean bg-muted/60 p-4 font-medium text-foreground">
          {linkify(block.text)}
        </p>
      );
  }
}

interface LegalDocumentProps {
  content: LegalDocumentContent;
  /** Same document in the other language. */
  alternate: { href: string; label: string; locale: string };
}

/**
 * Server-rendered legal page (privacy policy / terms). `lang` is set on the
 * content so the TR version is announced correctly by screen readers even
 * though the root <html lang> is "en" for the static HTML.
 */
export function LegalDocument({ content, alternate }: LegalDocumentProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <Navbar />
      <main id="main-content" className="flex-1" lang={content.locale}>
        <article className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-base leading-relaxed">
            <p className="mb-6 text-sm">
              <Link
                href={alternate.href}
                hrefLang={alternate.locale}
                lang={alternate.locale}
                className="underline underline-offset-2 hover:no-underline"
              >
                {alternate.label}
              </Link>
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{content.title}</h1>
            <p className="text-muted-foreground mb-8">
              {content.lastUpdatedLabel}: <time dateTime={LEGAL_LAST_UPDATED_ISO}>{content.lastUpdated}</time>
            </p>
            {content.intro.map((text) => (
              <p key={text} className="mb-4 text-muted-foreground">
                {text}
              </p>
            ))}

            <nav aria-labelledby="legal-toc" className="my-10 rounded-lg border p-5">
              <h2 id="legal-toc" className="text-base font-semibold mb-3">
                {content.tocLabel}
              </h2>
              <ol className="space-y-1.5 text-sm">
                {content.sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="underline-offset-2 hover:underline">
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {content.sections.map((section) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="mb-10 scroll-mt-24">
                <h2 id={`${section.id}-title`} className="text-2xl font-bold mb-4">
                  {section.title}
                </h2>
                {section.blocks.map((block, i) => (
                  <Block key={i} block={block} />
                ))}
              </section>
            ))}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
