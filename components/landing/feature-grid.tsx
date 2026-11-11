import type { CSSProperties } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterIcon, TagIcon, UploadIcon, LayersIcon, ExternalLinkIcon, SecurityIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n/i18n-context";
import { cn } from "@/lib/utils";

const TILE_SURFACE = {
    lemon: "bg-brand-lemon/10 border-brand-lemon/20",
    ocean: "border-brand-ocean/20 bg-brand-ocean/5",
    muted: "bg-muted/30",
};

type TileCopy = { title: string; desc: string };

type Highlight = {
    icon: typeof TagIcon;
    /** Takes two of the three columns from the md breakpoint up. */
    wide?: boolean;
    surface?: keyof typeof TILE_SURFACE;
    tr: TileCopy;
    en: TileCopy;
};

const HIGHLIGHTS: Highlight[] = [
    {
        icon: UploadIcon,
        wide: true,
        surface: "lemon",
        tr: { title: "Metadata Injection", desc: "Dosyaları yüklerken veya seçerken proje, durum, kanal bilgilerini ekle." },
        en: { title: "Metadata Injection", desc: "Add project, status and channel details while you upload or pick a file." },
    },
    {
        icon: FilterIcon,
        tr: { title: "Filtrelerle Bul", desc: "Klasör gezmeyi bırak. 'Q3' ve 'Approved' filtrelerini seçip sonuca ulaş." },
        en: { title: "Filter Your Way There", desc: "Skip the folder-by-folder hunt. Combine filters like 'Q3' and 'Approved' and land on the file." },
    },
    {
        icon: ExternalLinkIcon,
        tr: { title: "Doğrudan Drive'a", desc: "Dosyayı buldun mu? Tek tıkla orijinal Drive konumunda aç." },
        en: { title: "Straight to Drive", desc: "Once you spot a file, one click opens it where it lives in Drive." },
    },
    {
        icon: LayersIcon,
        surface: "muted",
        tr: { title: "Kendi Kategorilerin", desc: "Marketing, Sales, Product... Her dosyanın hangi işe ait olduğu belli olsun." },
        en: { title: "Your Own Categories", desc: "Marketing, Sales, Product... make it obvious which area each file belongs to." },
    },
    {
        icon: TagIcon,
        surface: "muted",
        tr: { title: "Kendi Durumların", desc: "Draft, Review, Final. Dosyanın yaşam döngüsünü takip et." },
        en: { title: "Statuses You Name", desc: "Draft, Review, Final. See what stage every file has reached." },
    },
    {
        icon: SecurityIcon,
        wide: true,
        surface: "ocean",
        tr: { title: "İzinler Aynı Kalır", desc: "Drive izinlerin aynen korunur. Kim neyi görüyor, o değişmez." },
        en: { title: "Drive Permissions", desc: "Sharing settings in Drive are left alone, so who can see what doesn't change." },
    },
];

const SECTION_COPY = {
    tr: {
        badge: "Neler Var",
        heading: "Kaos azalır, iş ilerler.",
        description: "FolderPls, Drive'daki dosyalarını klasörleri kurcalamadan bulmanı sağlar.",
    },
    en: {
        badge: "What's Inside",
        heading: "Less mess, more done.",
        description: "FolderPls helps you find your Drive files without digging through folders.",
    },
};

export function FeatureGrid() {
    const { locale } = useI18n();
    const { badge, heading, description } = SECTION_COPY[locale];

    return (
        <section id="product" className="py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16 max-w-2xl mx-auto">
                    <div className="reveal reveal-scale">
                        <Badge variant="secondary" className="mb-4">{badge}</Badge>
                    </div>
                    <h2 className="reveal reveal-soft text-3xl md:text-4xl font-bold mb-4 tracking-tight">{heading}</h2>
                    <p className="reveal text-muted-foreground" style={{ "--reveal-i": 1 } as CSSProperties}>{description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {HIGHLIGHTS.map((highlight, i) => (
                        <Card
                            key={highlight.en.title}
                            className={cn(
                                "reveal motion-lift motion-spotlight group hover:border-brand-ocean/50",
                                highlight.wide && "md:col-span-2",
                                highlight.surface && TILE_SURFACE[highlight.surface],
                            )}
                            style={{ "--reveal-i": i % 3 } as CSSProperties}>
                            <CardHeader className="pb-2">
                                <div className="w-10 h-10 rounded-lg bg-background border flex items-center justify-center mb-2 shadow-sm transition-transform duration-[var(--motion-duration-base)] ease-motion-spring group-hover:-rotate-6 group-hover:scale-110">
                                    <highlight.icon className="h-5 w-5 text-foreground" aria-hidden="true" />
                                </div>
                                <CardTitle className="text-xl">{highlight[locale].title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{highlight[locale].desc}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    )
}
