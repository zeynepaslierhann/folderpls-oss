"use client";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/brand-logo";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon, LanguageIcon, MenuIcon } from "@/components/icons";
import { TransitionLink as Link } from "@/components/motion/transition-link";
import { navigateWithTransition } from "@/lib/motion/view-transition";
import { useRouter, usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/i18n-context";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
interface NavbarProps {
    /**
     * "muted": the header's "Get Started" no longer competes with a
     * page-level primary CTA (e.g. the button on /pricing).
     * Defaults to "primary" everywhere else so existing pages are unchanged.
     */
    ctaEmphasis?: "primary" | "muted";
}

const smoothScrollTo = (selector: string) =>
    document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });

// The home page needs a moment to mount before its anchors exist.
const HOME_MOUNT_DELAY_MS = 100;

const landOnSection = (hash: string) => {
    window.location.hash = hash;
    smoothScrollTo(hash);
};

export function Navbar({ ctaEmphasis = "primary" }: NavbarProps) {
    const { setTheme, resolvedTheme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const { locale, setLocale, t } = useI18n();
    const otherLocale = locale === "tr" ? "en" : "tr";
    const otherLocaleName = otherLocale === "en" ? "English" : "Türkçe";
    const onHomePage = pathname === "/";

    const goToSection = (hash: string) => {
        if (onHomePage) {
            smoothScrollTo(hash);
            return;
        }
        router.push("/");
        window.setTimeout(landOnSection, HOME_MOUNT_DELAY_MS, hash);
    };

    const sectionClickHandler = (hash: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        goToSection(hash);
    };

    const onLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        if (onHomePage) window.scrollTo({ top: 0, behavior: "smooth" });
        else navigateWithTransition(() => router.push("/"));
    };

    const navLinkClass = "motion-underline hover:text-foreground transition-colors cursor-pointer";

    return (
        <header className="site-header sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            {/* Reading progress: scroll-driven scaleX, no JS. */}
            <div
                aria-hidden="true"
                className="scroll-progress bg-brand-flow-x pointer-events-none absolute inset-x-0 -bottom-px h-[2px]"
            />
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" onClick={onLogoClick} className="group flex items-center gap-2">
                    <BrandLogo
                        priority
                        className="h-8 w-auto rounded-sm transition-transform duration-[var(--motion-duration-base)] ease-motion-spring group-hover:-rotate-6 group-hover:scale-105"
                    />
                    <span className="font-bold text-2xl tracking-tight font-[family-name:var(--font-coiny)]">FolderPls</span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex gap-6 items-center text-sm font-medium text-muted-foreground">
                    <Link href="/#product" onClick={sectionClickHandler("#product")} className={navLinkClass}>{t("navbar.product")}</Link>
                    <Link href="/#use-cases" onClick={sectionClickHandler("#use-cases")} className={navLinkClass}>{t("navbar.useCases")}</Link>
                    <Link href="/pricing" aria-current={pathname === "/pricing" ? "page" : undefined} className={navLinkClass}>{t("navbar.pricing")}</Link>
                    <Link href="/#faq" onClick={sectionClickHandler("#faq")} className={navLinkClass}>{t("navbar.faq")}</Link>
                </nav>

                <div className="flex items-center gap-2">
                    {/* Always rendered (no mount gate): inserting them after
                        hydration used to shift the header (CLS). The sun/moon
                        swap is pure CSS via the .dark class. */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLocale(otherLocale)}
                        aria-label={otherLocaleName}
                        title={otherLocaleName}
                    >
                        <LanguageIcon className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                        aria-label="Toggle theme"
                    >
                        <SunIcon className="h-5 w-5 rotate-0 scale-100 transition-transform duration-[var(--motion-duration-slow)] ease-motion-spring dark:-rotate-90 dark:scale-0" />
                        <MoonIcon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform duration-[var(--motion-duration-slow)] ease-motion-spring dark:rotate-0 dark:scale-100" />
                    </Button>

                    <div className="hidden md:flex gap-2 items-center">
                        <Button
                            className={ctaEmphasis === "primary" ? "motion-shine bg-brand-lemon text-brand-dark hover:bg-brand-lemon/90 font-semibold" : "font-semibold"}
                            variant={ctaEmphasis === "primary" ? "default" : "outline"}
                            asChild
                        >
                            <Link href="/dashboard">{t("navbar.getStarted")}</Link>
                        </Button>
                    </div>

                    {/* Mobile Nav */}
                    <div className="md:hidden">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label={t("navbar.menu")}>
                                    <MenuIcon className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem onSelect={() => goToSection("#product")}>
                                    {t("navbar.product")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => goToSection("#use-cases")}>
                                    {t("navbar.useCases")}
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/pricing" aria-current={pathname === "/pricing" ? "page" : undefined}>
                                        {t("navbar.pricing")}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => goToSection("#faq")}>
                                    {t("navbar.faq")}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard">{t("navbar.getStarted")}</Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </header>
    );
}
