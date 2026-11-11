import type { CSSProperties } from "react";
import { AlertIcon, SuccessIcon, LinkIcon, TagsIcon, ExternalLinkIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n/i18n-context";
import { HierarchyToTags } from "./hierarchy-to-tags";

const STORY = {
    tr: {
        problemTitle: "Drive klasörleri zamanla içinden çıkılmaz olur.",
        problemText: "Müşteriler birikir, klasörler çoğalır. \"Müşteriler > Acme > 2024 > Final > final_v3\" bir labirente döner; tek bir dosyayı bulmak için klasörleri tek tek açarsın.",
        solutionSubtitle: "Her şeyin bir yeri var.",
        solutionText: `Metadata-first. Etiketleme dosyalarını taşımaz. Tıpkı mutfaktaki profesyonel hazırlık gibi, onları ihtiyacın olan etiketlerle (status, channel, campaign) "hazır"larsın. Etiketler tarayıcında durur, Drive'ın olduğu gibi kalır.`,
        steps: [
            { title: "Drive'ını Bağla", desc: "Google'ın onay ekranında Drive erişimine izin ver. FolderPls yalnızca seçtiğin dosyalara erişir." },
            { title: "Etiketle ve Süz", desc: "Dosyaları taşımadan etiketle. Etikete, duruma, tarihe veya dosya türüne göre filtrele." },
            { title: "Drive'a Geç", desc: "Dosyayı kullanmak istediğinde seni doğrudan Drive'daki orijinal konumuna götürür." },
        ],
    },
    en: {
        problemTitle: "Over time, Drive folders fall apart.",
        problemText: "Clients pile up and folders multiply. \"Clients > Acme > 2024 > Final > final_v3\" becomes a maze, and you open folder after folder to find one file.",
        solutionSubtitle: "A place for everything.",
        solutionText: `Metadata-first. Tagging doesn't move your files. Just like professional mise en place in a kitchen, you prep them with the tags you need (status, channel, campaign). The tags stay in your browser and your Drive stays as it is.`,
        steps: [
            { title: "Link Your Drive", desc: "Allow Drive access on Google's consent screen. FolderPls only gets access to the files you choose." },
            { title: "Tag, Then Filter", desc: "Tag files without moving them. Filter by tag, status, date or file type." },
            { title: "Back to Drive", desc: "When you need the file itself, go directly to its spot in Drive." },
        ],
    },
};

const STEP_ICONS = [LinkIcon, TagsIcon, ExternalLinkIcon];

export function ProblemSolution() {
    const { problemTitle, problemText, solutionSubtitle, solutionText, steps } = STORY[useI18n().locale];

    return (
        <section className="relative py-24 bg-background">
            <div className="container mx-auto px-4">

                {/* Connection line: grows as you arrive */}
                <div className="flex justify-center mb-16" aria-hidden="true">
                    <div className="reveal reveal-scale h-16 w-px" style={{ backgroundImage: "linear-gradient(transparent, rgb(62 95 136 / 0.4), transparent)" }} />
                </div>

                {/* Problem */}
                <div className="max-w-3xl mx-auto mb-12 text-center">
                    <div className="reveal reveal-scale inline-flex items-center justify-center p-2 rounded-full bg-red-100 text-red-700 mb-4 dark:bg-red-900/20 dark:text-red-400">
                        <AlertIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <h2 className="reveal reveal-soft text-3xl md:text-5xl font-bold mb-6 tracking-tight">{problemTitle}</h2>
                    <p className="reveal text-lg text-muted-foreground" style={{ "--reveal-i": 1 } as CSSProperties}>{problemText}</p>
                </div>

                {/* Scroll-synced: Drive hierarchy -> FolderPls tag layer */}
                <HierarchyToTags />

                {/* Solution */}
                <div className="max-w-5xl mx-auto mt-20 md:mt-28">
                    <div className="text-center mb-14">
                        <div className="reveal reveal-scale inline-flex items-center justify-center p-2 rounded-full bg-brand-lemon/30 text-brand-dark dark:text-brand-lemon mb-4">
                            <SuccessIcon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <h2 className="reveal reveal-soft text-3xl md:text-5xl font-bold mb-6 tracking-tight">
                            <span className="font-[family-name:var(--font-coiny)]">Mise en place:</span> {solutionSubtitle}
                        </h2>
                        <p className="reveal text-lg text-muted-foreground max-w-2xl mx-auto" style={{ "--reveal-i": 1 } as CSSProperties}>{solutionText}</p>
                    </div>

                    <ol className="grid gap-5 md:grid-cols-3">
                        {steps.map(({ title, desc }, position) => {
                            const StepIcon = STEP_ICONS[position];
                            return (
                                <li
                                    key={title}
                                    className="reveal motion-lift motion-spotlight group rounded-2xl border border-border/70 bg-card/70 p-6 backdrop-blur-sm"
                                    style={{ "--reveal-i": position } as CSSProperties}
                                >
                                    <div className="mb-5 flex items-center justify-between">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-xl border bg-background shadow-sm transition-transform duration-[var(--motion-duration-base)] ease-motion-spring group-hover:-rotate-6 group-hover:scale-110">
                                            <StepIcon className="h-5 w-5 text-brand-ocean-ink" aria-hidden="true" />
                                        </span>
                                        <span className="text-3xl font-bold text-foreground/15 font-[family-name:var(--font-coiny)]" aria-hidden="true">
                                            {String(position + 1).padStart(2, "0")}
                                        </span>
                                    </div>
                                    <h3 className="mb-2 text-xl font-bold">{title}</h3>
                                    <p className="text-muted-foreground">{desc}</p>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </div>
        </section>
    )
}
