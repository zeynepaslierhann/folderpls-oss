"use client";

import type { CSSProperties } from "react";
import { CheckIcon, MinusIcon, ExternalLinkIcon, ArrowRightIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/i18n-context";
import { TransitionLink } from "@/components/motion/transition-link";
import {
  COMPARISON_CHECKED_ON,
  COMPARISON_ROWS,
  COMPARISON_SOURCES,
  type ComparisonRow,
} from "@/lib/marketing/drive-labels-comparison";
import { formatIsoDate } from "@/lib/utils/date";

interface DriveLabelsComparisonProps {
  /** Landing shows the 4 key rows; /pricing shows all of them. */
  variant?: "compact" | "full";
  /** h2 on the landing / pricing page. */
  headingLevel?: "h2" | "h3";
}

function EdgeIcon({ row, side }: { row: ComparisonRow; side: "folderpls" | "drive-labels" }) {
  if (row.edge === side) return <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />;
  return <MinusIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
}

export function DriveLabelsComparison({ variant = "compact", headingLevel = "h2" }: DriveLabelsComparisonProps) {
  const { locale } = useI18n();
  const isTr = locale === "tr";
  const Heading = headingLevel;
  const rows = variant === "compact" ? COMPARISON_ROWS.filter((r) => r.compact) : COMPARISON_ROWS;
  const sourceNumber = (id: string) => COMPARISON_SOURCES.findIndex((s) => s.id === id) + 1;
  const checked = formatIsoDate(COMPARISON_CHECKED_ON, isTr ? "tr" : "en");

  const t = {
    badge: isTr ? "Dürüst karşılaştırma" : "An honest comparison",
    title: isTr ? "Workspace hesabın yok mu? Yine de etiketle." : "No Workspace account? Label your files anyway.",
    lead: isTr
      ? "Drive'ın kendi etiketlerini iş ya da okulda Drive kullanan kuruluşlarda yalnızca yöneticiler oluşturur ve bazı Google Workspace sürümleri destekler. Kişisel Google hesabıyla da etiketlemek istiyorsan FolderPls bunun için."
      : "Drive's own labels are created by administrators for Drive used at work or school, and only some Google Workspace editions support them. If you are on a personal Google account and still want labels, FolderPls is for you.",
    feature: isTr ? "Özellik" : "Feature",
    labels: isTr ? "Google Drive etiketleri" : "Google Drive Labels",
    fairNote: isTr
      ? "Kuruluşunun uygun bir Workspace sürümü varsa ve yönetici denetimli, politika destekli sınıflandırma istiyorsan Drive etiketleri doğru seçim olabilir."
      : "If your organization already has an eligible Workspace edition and wants admin-managed, policy-aware classification, Drive Labels may be the right choice.",
    sources: isTr ? "Kaynaklar" : "Sources",
    checked: isTr ? `Google bilgileri ${checked} tarihinde kontrol edildi; özellikler değişebilir.` : `Google details checked on ${checked}; features can change.`,
    readMore: isTr ? "Drive etiketlerinin sınırlarını oku (İngilizce)" : "Read the full breakdown of Drive Labels limits",
    checker: isTr ? "Hesabında Drive etiketleri var mı? Denetleyiciyi dene (İngilizce)" : "Does your account have Drive Labels? Try the checker",
    compare: isTr ? "FolderPls ve Drive etiketleri yan yana (İngilizce)" : "FolderPls vs Google Drive Labels, side by side",
    newTab: isTr ? "(yeni sekmede açılır)" : "(opens in a new tab)",
  };

  const tr = (v: { en: string; tr: string }) => (isTr ? v.tr : v.en);

  return (
    <section id="drive-labels" className="py-20 md:py-24" aria-labelledby="drive-labels-heading">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="reveal reveal-scale">
            <Badge variant="secondary" className="mb-4">
              {t.badge}
            </Badge>
          </div>
          <Heading id="drive-labels-heading" className="reveal reveal-soft mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            {t.title}
          </Heading>
          <p className="reveal text-lg text-muted-foreground" style={{ "--reveal-i": 1 } as CSSProperties}>
            {t.lead}
          </p>
        </div>

        {/* Desktop / tablet: a real table */}
        <div className="reveal reveal-scale relative hidden overflow-hidden rounded-2xl border border-border/70 bg-card/70 shadow-xl backdrop-blur-sm md:block">
          {/* FolderPls column highlight */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-[34%]"
            style={{ backgroundImage: "linear-gradient(rgb(255 229 0 / 0.25), rgb(255 229 0 / 0.1), transparent)" }}
          />
          <table className="relative w-full text-left text-sm">
            <caption className="sr-only">{t.title}</caption>
            <thead>
              <tr className="border-b border-border/70">
                <th scope="col" className="w-[32%] px-6 py-4 font-semibold text-muted-foreground">
                  {t.feature}
                </th>
                <th scope="col" className="w-[34%] px-6 py-4 font-semibold">
                  {t.labels}
                </th>
                <th scope="col" className="w-[34%] px-6 py-4 font-semibold">
                  <span className="font-[family-name:var(--font-coiny)] text-base">FolderPls</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} className="reveal border-b border-border/50 last:border-0" style={{ "--reveal-i": Math.min(i, 3) } as CSSProperties}>
                  <th scope="row" className="px-6 py-4 align-top font-medium">
                    {tr(row.feature)}
                  </th>
                  <td className="px-6 py-4 align-top text-muted-foreground">
                    <span className="flex gap-2">
                      <EdgeIcon row={row} side="drive-labels" />
                      <span>
                        {tr(row.driveLabels)}
                        {row.sourceIds.map((id) => (
                          <sup key={id} className="ml-0.5">
                            <a href={`#drive-labels-source-${id}`} className="text-brand-ocean-ink hover:underline">
                              [{sourceNumber(id)}]
                            </a>
                          </sup>
                        ))}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-4 align-top font-medium">
                    <span className="flex gap-2">
                      <EdgeIcon row={row} side="folderpls" />
                      <span>{tr(row.folderpls)}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Phone: stacked cards, same content */}
        <ul className="space-y-4 md:hidden">
          {rows.map((row) => (
            <li key={row.id} className="reveal rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm">
              <h3 className="mb-3 font-semibold">{tr(row.feature)}</h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground">{t.labels}</dt>
                  <dd className="flex gap-2 text-muted-foreground">
                    <EdgeIcon row={row} side="drive-labels" />
                    <span>
                      {tr(row.driveLabels)}
                      {row.sourceIds.map((id) => (
                        <sup key={id} className="ml-0.5">
                          <a href={`#drive-labels-source-${id}`} className="text-brand-ocean-ink hover:underline">
                            [{sourceNumber(id)}]
                          </a>
                        </sup>
                      ))}
                    </span>
                  </dd>
                </div>
                <div className="rounded-xl bg-brand-lemon/25 p-3">
                  <dt className="mb-1 text-xs font-semibold tracking-wide">FolderPls</dt>
                  <dd className="flex gap-2 font-medium">
                    <EdgeIcon row={row} side="folderpls" />
                    <span>{tr(row.folderpls)}</span>
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>

        <p className="mx-auto mt-6 max-w-3xl text-center text-sm text-muted-foreground">{t.fairNote}</p>

        <div className="mt-8 flex flex-col items-center gap-4 text-sm">
          {[
            { href: "/blog/google-drive-labels-limits", label: t.readMore },
            { href: "/drive-labels-checker", label: t.checker },
            { href: "/blog/folderpls-vs-google-drive-labels", label: t.compare },
          ].map((link) => (
            <TransitionLink
              key={link.href}
              href={link.href}
              className="group inline-flex items-center gap-1.5 font-semibold text-brand-ocean-ink"
            >
              <span className="motion-underline">{link.label}</span>
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-[var(--motion-duration-base)] ease-motion-out group-hover:translate-x-1" aria-hidden="true" />
            </TransitionLink>
          ))}
          <div className="text-center text-xs text-muted-foreground">
            <p className="mb-1 font-semibold">{t.sources}</p>
            <ol className="space-y-1">
              {COMPARISON_SOURCES.map((source, i) => (
                <li key={source.id} id={`drive-labels-source-${source.id}`}>
                  [{i + 1}]{" "}
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground">
                    {source.title}
                    <ExternalLinkIcon className="h-3 w-3" aria-hidden="true" />
                    <span className="sr-only">{t.newTab}</span>
                  </a>
                </li>
              ))}
            </ol>
            <p className="mt-2">{t.checked}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
