import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { MailIcon } from "@/components/icons";
import type { Metadata } from "next";
import { ContactFAQSchema } from "@/components/seo/faq-schema";
import { CONTACT_EMAIL, PROJECT_ISSUES_URL, SITE_URL } from "@/lib/constants/site";
import { CONTACT_FAQ } from "@/lib/marketing/contact-faq";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/og";
import { PAGE_META } from "@/lib/seo/page-meta";

const siteUrl = SITE_URL;

export const metadata: Metadata = {
  title: PAGE_META.contact.title,
  description: PAGE_META.contact.description,
  keywords: [
    "FolderPls contact",
    "file organization support",
    "Google Drive help",
    "metadata tagging FAQ",
    "customer support"
  ],
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: PAGE_META.contact.ogTitle,
    description: PAGE_META.contact.ogDescription,
    url: `${siteUrl}/contact`,
  },
  alternates: {
    canonical: `${siteUrl}/contact`,
  },
};

function CommonQuestions() {
  return (
    <section className="mb-16">
      <h2 className="mb-6 text-center text-2xl font-bold">Common Questions</h2>
      <Accordion type="single" collapsible className="w-full">
        {CONTACT_FAQ.map(({ q, a }, position) => (
          <AccordionItem key={q} value={`item-${position}`}>
            <AccordionTrigger className="text-left text-lg font-medium">{q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">{a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function WriteToUs() {
  return (
    <section className="border-t border-border/50 pt-12 text-center">
      <p className="mb-6 text-lg text-muted-foreground">
        Can&apos;t find what you&apos;re looking for?
      </p>
      <Button asChild size="lg" className="bg-brand-lemon font-bold text-brand-dark hover:bg-brand-lemon/90">
        <a href={CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}` : PROJECT_ISSUES_URL}>
          <MailIcon className="mr-2 h-5 w-5" />
          {CONTACT_EMAIL ? "Send Us an Email" : "Open an Issue"}
        </a>
      </Button>
      {/* Adres görünür metin: posta istemcisi olmayan ziyaretçi de görebilsin. */}
      {CONTACT_EMAIL ? (
        <p className="mt-5 text-sm text-muted-foreground">
          Or write to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>
        </p>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">
          Or open an issue on{" "}
          <a href={PROJECT_ISSUES_URL} className="font-medium text-foreground underline underline-offset-2">
            GitHub
          </a>
        </p>
      )}
    </section>
  );
}

export default function ContactRoute() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <ContactFAQSchema />
      <Navbar />
      <main className="flex-1">
        <section className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <header className="mb-12 text-center">
              <h1 className="mb-4 text-4xl font-bold md:text-5xl">Talk to Us</h1>
              <p className="text-xl text-muted-foreground">
                Have a question? We&apos;re here to help.
              </p>
            </header>

            <CommonQuestions />
            <WriteToUs />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
