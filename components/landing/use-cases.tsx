import type { CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/i18n-context";

const SCENARIOS = {
    tr: {
        heading: "Hangi işi yaparsan yap, dosyanı bul.",
        cases: [
            { role: "Yaratıcı İşler", problem: "Revizyonlar nerede kayboldu?", solution: "'Approved' etiketiyle filtrele, yalnız son hâl olarak işaretlediğin dosyaları gör." },
            { role: "Pazarlama Ekipleri", problem: "Hangi görsel hangi kampanyanın?", solution: "Kampanya adını filtre yap, 2023 klasörleri arasında dolaşma." },
            { role: "Ajans Ekipleri", problem: "Müşterinin dosyaları karışıyor.", solution: "Her müşteriye kendi etiketini ver, tek ekrandan etikete göre filtrele." },
            { role: "İnsan Kaynakları ve Operasyon", problem: "Sözleşmeler ve faturalar...", solution: "Tarih filtresi ve kendi etiketlerinle (ör. departman) saniyeler içinde bul." },
        ],
    },
    en: {
        heading: "Whatever the work, find the file.",
        cases: [
            { role: "Creative Work", problem: "Where did those final revisions end up?", solution: "Filter by the 'Approved' tag and see only the files you marked as final." },
            { role: "Marketing Managers", problem: "Which campaign was this asset made for?", solution: "Pick the campaign name as a filter and skip the 2023 folders." },
            { role: "Agency Teams", problem: "Every client's files are mixed together.", solution: "Give each client its own tag and filter by it from one screen." },
            { role: "People & Operations", problem: "Contracts here, invoices there...", solution: "Find files in seconds with the date filter and your own tags (a department, say)." },
        ],
    },
};

export function UseCases() {
    const { heading, cases } = SCENARIOS[useI18n().locale];

    return (
        <section className="py-24 bg-muted/30 dark:bg-brand-dark text-foreground relative overflow-hidden" id="use-cases">
            {/* Background accent: drifts slower than the page (scroll parallax) */}
            <div
                aria-hidden="true"
                className="parallax absolute -top-[10%] right-0 w-1/2 h-[120%] pointer-events-none"
                style={{ "--parallax-from": "-60px", "--parallax-to": "60px", backgroundImage: "linear-gradient(to left, rgb(155 179 208 / 0.12), transparent)" } as CSSProperties}
            />

            <div className="container mx-auto px-4 relative z-10">
                <h2 className="reveal reveal-soft text-3xl md:text-5xl font-bold mb-12 text-center tracking-tight">{heading}</h2>

                <div className="grid md:grid-cols-2 gap-8">
                    {cases.map((c, i) => (
                        <div
                            key={i}
                            className={`reveal ${i % 2 === 0 ? "reveal-left" : "reveal-right"} motion-lift motion-spotlight group relative bg-card/50 border border-border/50 rounded-xl p-8 hover:bg-card hover:border-brand-ocean/30`}
                            style={{ "--reveal-i": Math.floor(i / 2) } as CSSProperties}
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-[opacity,transform] duration-[var(--motion-duration-slow)] ease-motion-spring group-hover:-translate-y-1 group-hover:rotate-6" aria-hidden="true">
                                <span className="text-6xl font-black font-serif">&quot;</span>
                            </div>
                            <Badge variant="outline" className="text-brand-ocean-ink border-brand-ocean dark:text-brand-lemon dark:border-brand-lemon mb-4">{c.role}</Badge>
                            <h3 className="text-xl font-bold mb-2 group-hover:text-brand-ocean-ink transition-colors">{c.problem}</h3>
                            <p className="text-muted-foreground">{c.solution}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
