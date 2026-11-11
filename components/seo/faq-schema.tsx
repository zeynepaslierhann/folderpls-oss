import { CONTACT_FAQ } from "@/lib/marketing/contact-faq";
import { HOME_FAQ_EN, HOME_FAQ_SCHEMA_COUNT, faqPageJsonLd } from "@/lib/marketing/home-faq";

export function HomepageFAQSchema() {
  const faqSchema = faqPageJsonLd(HOME_FAQ_EN.slice(0, HOME_FAQ_SCHEMA_COUNT));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
    />
  );
}

export function ContactFAQSchema() {
  const faqSchema = faqPageJsonLd(CONTACT_FAQ);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
    />
  );
}
