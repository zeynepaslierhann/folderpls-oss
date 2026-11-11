"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { lockedWidthStyle } from "@/lib/ui/delayed-visibility"
import { Spinner } from "@/components/ui/loading/spinner"

/**
 * Yalnız pazarlama sitesi (html[data-fp-app] YOK): eski hover kaldırma
 * efekti ve geçiş özellikleri. Panelde hover'da ölçek/gölge yok (spec §1.3);
 * <AppScope> panel rotalarında bu işareti koyduğu için orada hiç devreye
 * girmez. Satırlar panel stil kapısında (tests/unit/ui) bu işaretle muaftır.
 */
const MKT_TRANSITION = "[html:not([data-fp-app])_&]:transition-[color,background-color,border-color,box-shadow,scale,translate,opacity]"
const MKT_LIFT_LG = "[html:not([data-fp-app])_&]:hover:scale-[1.02] [html:not([data-fp-app])_&]:hover:shadow-lg [html:not([data-fp-app])_&]:active:scale-[var(--motion-scale-press)]"
const MKT_LIFT_MD = "[html:not([data-fp-app])_&]:hover:scale-[1.02] [html:not([data-fp-app])_&]:hover:shadow-md [html:not([data-fp-app])_&]:active:scale-[var(--motion-scale-press)]"
const MKT_PRESS = "[html:not([data-fp-app])_&]:hover:scale-[1.02] [html:not([data-fp-app])_&]:active:scale-[var(--motion-scale-press)]"

/**
 * Düğme sistemi (spec §1.3): ekran başına tek `primary`, diğer her şey
 * `secondary` / `ghost`; `danger` yalnız onay dialog'undaki son silme
 * düğmesi. Hover'da ölçek ya da gölge yok — yalnız renk (≤100ms).
 *
 * Devre dışı dolgulu düğmeler (primary/danger/upgrade) ağır bir gri ya da
 * pembe blok olmaz: nötr %10 zemin + --fg-3 metin. `loading` sürerken
 * (aria-busy) düğme kendi rengini korur.
 *
 * Eski adlar korunur (pazarlama sitesi kullanıyor): default = primary,
 * outline = secondary, destructive = danger.
 */
const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-[0.875rem] leading-5 font-medium ring-offset-background transition-colors duration-[var(--dur-fast)] ease-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none [&:disabled:not([aria-busy])]:opacity-50 [&_svg]:shrink-0 " + MKT_TRANSITION,
    {
        variants: {
            variant: {
                primary: "bg-primary text-primary-foreground hover:bg-primary/90 [&:disabled:not([aria-busy])]:bg-fg/10 [&:disabled:not([aria-busy])]:text-fg-3 [&:disabled:not([aria-busy])]:opacity-100",
                default: "bg-primary text-primary-foreground hover:bg-primary/90 [&:disabled:not([aria-busy])]:bg-fg/10 [&:disabled:not([aria-busy])]:text-fg-3 [&:disabled:not([aria-busy])]:opacity-100 " + MKT_LIFT_LG,
                secondary:
                    "border border-control bg-raised text-foreground hover:bg-hover",
                outline:
                    // --control: kökte muted-foreground/70 (pazarlamadaki ≥3:1 sınır),
                    // panelde #8F8872 (≥3:1, WCAG 1.4.11).
                    "border border-control bg-raised text-foreground hover:bg-hover " + MKT_LIFT_MD,
                ghost: "text-foreground hover:bg-hover " + MKT_PRESS,
                danger: "bg-danger text-white hover:bg-danger/90 dark:text-canvas [&:disabled:not([aria-busy])]:bg-fg/10 [&:disabled:not([aria-busy])]:text-fg-3 [&:disabled:not([aria-busy])]:opacity-100",
                destructive: "bg-danger text-white hover:bg-danger/90 dark:text-canvas [&:disabled:not([aria-busy])]:bg-fg/10 [&:disabled:not([aria-busy])]:text-fg-3 [&:disabled:not([aria-busy])]:opacity-100 " + MKT_LIFT_LG,
                link: "text-foreground underline-offset-4 hover:underline",
                /** Limon dolgu: uygulamada YALNIZ Upgrade/Pro eylemi (marka anı). Metin her zaman koyu. */
                upgrade: "bg-lemon text-[#22201B] hover:bg-lemon/85 [&:disabled:not([aria-busy])]:bg-fg/10 [&:disabled:not([aria-busy])]:text-fg-3 [&:disabled:not([aria-busy])]:opacity-100",
            },
            size: {
                /** 40px — dialog içi birincil eylem, mobil; pazarlamanın eski varsayılanı. */
                default: "h-10 px-4",
                /** Pazarlama sitesinin büyük düğmesi (panelde kullanılmaz). */
                lg: "h-11 px-8 shadow-xl",
                /** 32px — panelde varsayılan (araç çubuğu, form). */
                md: "h-8 px-3",
                /** 28px — kompakt. */
                sm: "h-7 px-2.5",
                icon: "h-10 w-10",
                "icon-md": "h-8 w-8",
                "icon-sm": "h-7 w-7",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
    /**
     * Kısa eylem sürüyor: baştaki ikonun yerine Spinner gelir, genişlik
     * kilitlenir, düğme devre dışı ve aria-busy olur. Metni fiile çevirmek
     * ("Saving…") çağıranın işidir.
     */
    loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, loading = false, disabled, style, children, ...props }, ref) => {
        const innerRef = React.useRef<HTMLButtonElement | null>(null)
        const [lockedWidth, setLockedWidth] = React.useState<number | null>(null)

        React.useLayoutEffect(() => {
            if (loading && innerRef.current) setLockedWidth(innerRef.current.offsetWidth)
            else if (!loading) setLockedWidth(null)
        }, [loading])

        const setRefs = React.useCallback(
            (node: HTMLButtonElement | null) => {
                innerRef.current = node
                if (typeof ref === "function") ref(node)
                else if (ref) ref.current = node
            },
            [ref]
        )

        if (asChild) {
            // Slot düğme olmayabilir (<a>): `disabled` özniteliği geçmez. Durum
            // aria-disabled/aria-busy ile bildirilir, etkileşim pointer-events
            // ile kapanır. Spinner'ı içeriğin kendisi koyar (Slot tek çocuk alır).
            const inactive = disabled || loading
            return (
                <Slot
                    className={cn(buttonVariants({ variant, size, className }), inactive && "pointer-events-none", disabled && !loading && "opacity-50")}
                    ref={ref}
                    style={style}
                    aria-disabled={inactive || undefined}
                    aria-busy={loading || undefined}
                    {...props}
                >
                    {children}
                </Slot>
            )
        }

        return (
            <button
                className={cn(buttonVariants({ variant, size, className }), loading && "gap-2 [&>svg]:hidden")}
                ref={setRefs}
                disabled={disabled || loading}
                aria-busy={loading || undefined}
                style={{ ...style, ...lockedWidthStyle(loading, lockedWidth) }}
                {...props}
            >
                {loading && <Spinner />}
                {children}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
