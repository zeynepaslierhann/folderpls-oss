import type { CSSProperties } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useI18n } from "@/lib/i18n/i18n-context";
import { HOME_FAQ_EN, HOME_FAQ_TR } from "@/lib/marketing/home-faq";

const FAQ_COPY = {
    tr: { heading: "Merak Edilenler", entries: HOME_FAQ_TR },
    en: { heading: "Questions People Ask", entries: HOME_FAQ_EN },
};

export function FAQ() {
    const { heading, entries } = FAQ_COPY[useI18n().locale];

    return (
        <section className="py-24 bg-muted/20" id="faq">
            <div className="container mx-auto px-4 max-w-3xl">
                <h2 className="reveal reveal-soft text-3xl md:text-4xl font-bold mb-12 text-center tracking-tight">{heading}</h2>
                <Accordion type="single" collapsible className="w-full">
                    {entries.map((item, i) => (
                        <AccordionItem key={i} value={`item-${i}`} className="reveal" style={{ "--reveal-i": Math.min(i, 2) } as CSSProperties}>
                            <AccordionTrigger className="text-left text-lg font-medium">{item.q}</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground leading-relaxed">
                                {item.a}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    )
}
