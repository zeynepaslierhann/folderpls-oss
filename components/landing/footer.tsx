"use client";

import type { ReactNode } from "react";
import { TransitionLink as Link } from "@/components/motion/transition-link";
import { navigateWithTransition } from "@/lib/motion/view-transition";
import { BrandLogo } from "@/components/brand/brand-logo";
import { useRouter, usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/i18n-context";
import { LEGAL_PATHS } from "@/lib/legal/types";

function LinkColumn({ heading, children }: { heading: string; children: ReactNode }) {
    return (
        <div>
            <h2 className="text-base font-semibold mb-4">{heading}</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">{children}</ul>
        </div>
    );
}

function ColumnLink({ href, children }: { href: string; children: ReactNode }) {
    return (
        <li>
            <Link href={href} className="motion-underline hover:text-foreground">{children}</Link>
        </li>
    );
}

export function Footer() {
    const router = useRouter();
    const pathname = usePathname();
    const { locale } = useI18n();
    const say = (tr: string, en: string) => (locale === "tr" ? tr : en);

    const onLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        if (pathname !== "/") {
            navigateWithTransition(() => router.push("/"));
            return;
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <footer className="border-t bg-background py-16">
            <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="col-span-2 md:col-span-1">
                    <Link href="/" onClick={onLogoClick} className="flex items-center gap-2 mb-4">
                        <BrandLogo className="h-8 w-auto rounded-sm grayscale hover:grayscale-0 transition-all" />
                        <span className="font-bold text-xl font-[family-name:var(--font-coiny)]">FolderPls</span>
                    </Link>
                    <p className="text-sm text-muted-foreground mb-6">
                        {say("Dosyalar Drive'da, etiketler tarayıcında.", "Files stay in Drive, tags stay in your browser.")}
                        <br />
                        {say("Mutfaktaki düzeni işine getir.", "Run your files like a well-kept kitchen.")}
                    </p>
                </div>

                {/* /pricing is deliberately left out of the footer. */}
                <LinkColumn heading={say("Ürün", "Product")}>
                    <ColumnLink href="/features">{say("Özellikler", "Features")}</ColumnLink>
                    <ColumnLink href="/integrations">{say("Entegrasyonlar", "Integrations")}</ColumnLink>
                    <ColumnLink href="/demo">{say("Örnek veriyle demo (İngilizce)", "Demo with sample data")}</ColumnLink>
                    <ColumnLink href="/drive-labels-checker">{say("Drive etiketleri denetleyicisi (İngilizce)", "Drive Labels checker")}</ColumnLink>
                    <ColumnLink href="/blog/how-to-tag-files-in-google-drive">{say("Drive'da dosya etiketleme rehberi (İngilizce)", "How to tag files in Drive")}</ColumnLink>
                    <ColumnLink href="/changelog">{say("Değişiklikler", "Changelog")}</ColumnLink>
                </LinkColumn>

                <LinkColumn heading={say("Proje", "Project")}>
                    <ColumnLink href="/about">{say("Hakkımızda", "About")}</ColumnLink>
                    <ColumnLink href="/blog">Blog</ColumnLink>
                    <ColumnLink href="/contact">{say("İletişim", "Contact")}</ColumnLink>
                </LinkColumn>

                <LinkColumn heading={say("Hukuki", "Legal")}>
                    <ColumnLink href={LEGAL_PATHS.privacy[locale]}>{say("Gizlilik Politikası", "Privacy Policy")}</ColumnLink>
                    <ColumnLink href={LEGAL_PATHS.terms[locale]}>{say("Kullanım Şartları", "Terms of Service")}</ColumnLink>
                </LinkColumn>
            </div>

            <div className="container mx-auto px-4 mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} FolderPls. {say("MIT Lisansı ile açık kaynak.", "Open source under the MIT License.")}
            </div>
        </footer>
    )
}
