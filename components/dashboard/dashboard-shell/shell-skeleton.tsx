"use client";

import type { ReactNode } from "react";
import { DriveIcon, MenuIcon, SearchIcon, GraphIcon, TagIcon, TagsIcon, DeleteIcon } from "@/components/icons";
import { Skeleton } from "@/components/ui/loading";
import { useI18n } from "@/lib/i18n/i18n-context";
import { PanelBrandLogo } from "@/components/brand/panel-brand-logo";

const ROWS = 8;

/** Liste satırı iskeleti: 40px, FileItem sütunlarıyla aynı hizada (spec §4.1). */
export function ListRowsSkeleton({ rows = ROWS }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-14 items-center gap-3 px-2 sm:h-10">
          <span className="w-6 shrink-0" />
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <Skeleton className="size-4 shrink-0" />
            <Skeleton className="h-3" style={{ width: `${30 + ((i * 17) % 35)}%` }} />
          </div>
          <div className="hidden w-22 shrink-0 justify-end sm:flex">
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="hidden w-32 shrink-0 justify-end sm:flex">
            <Skeleton className="h-3 w-20" />
          </div>
          <span className="w-8 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Ayarlar sayfası iskeleti (organizasyon): bölüm kartlarının şekli. */
function SettingsSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      {[4, 2].map((rows, i) => (
        <div key={i} className="space-y-3 rounded-lg border border-line p-4">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="flex items-center gap-3">
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export type ContentSkeletonShape = "list" | "settings";

/**
 * İçerik bölgesi iskeleti (yalnız içerik — kabuk ve başlık gerçek).
 * Hidrasyondan önce de çalışsın diye 150ms gecikme CSS ile (`.fp-delay-in`):
 * sunucu HTML'i yavaş ağda JS'den önce gelir ve iskelet yine görünür.
 */
export function ContentBodySkeleton({ shape = "list" }: { shape?: ContentSkeletonShape }) {
  const { t } = useI18n();
  return (
    <div className="min-h-0 flex-1" aria-busy="true">
      <p role="status" className="sr-only">
        {t("common.loading")}
      </p>
      <div className="fp-delay-in">
        {shape === "settings" ? (
          <SettingsSkeleton />
        ) : (
          <div className="px-2 pt-9">
            <ListRowsSkeleton />
          </div>
        )}
      </div>
    </div>
  );
}

/** Yükleme sırasında üst çubuk: ☰ ve gerçek başlık, eylem yok. */
function StaticTopBar({ title }: { title: ReactNode }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-4">
      <span aria-hidden="true" className="-ml-2 flex size-10 shrink-0 items-center justify-center text-fg md:hidden">
        <MenuIcon className="h-4 w-4" />
      </span>
      <h1 className="min-w-0 truncate text-lg font-semibold">{title}</h1>
    </header>
  );
}

/**
 * İçerik bölgesi iskeleti: gerçek başlıklı üst çubuk + gecikmeli gövde.
 * DashboardShell `loading` iken kullanır.
 */
export function ContentSkeleton({ title, shape }: { title?: ReactNode; shape?: ContentSkeletonShape }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <StaticTopBar title={title ?? t("dashboard.panel.drive")} />
      <ContentBodySkeleton shape={shape} />
    </div>
  );
}

const rowCls = "flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-fg-2";
const iconCls = "h-4 w-4 shrink-0";

/** Kenar çubuğunun durağan kopyası: aynı öğeler, aynı yerde; yalnız çalışma alanı adı bilinmiyor. */
function StaticSidebar() {
  const { t } = useI18n();
  return (
    <div className="flex h-full min-h-0 flex-col" inert>
      <div className="space-y-1 p-3 pb-2">
        <div className="flex h-8 items-center gap-2 px-2">
          <PanelBrandLogo className="size-5 shrink-0 rounded-sm object-contain" />
          <Skeleton className="fp-delay-in h-3 w-24" />
        </div>
        <div className="flex h-8 items-center gap-2 rounded-md border border-control bg-raised px-2 text-sm text-fg-3">
          <SearchIcon className={iconCls} aria-hidden="true" />
          <span className="flex-1">{t("dashboard.panel.search")}</span>
          <kbd className="rounded-sm border border-line px-1 font-sans text-xs text-fg-3">⌘K</kbd>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 px-3 pb-3">
        <div className={rowCls}>
          <DriveIcon className={iconCls} aria-hidden="true" />
          {t("dashboard.panel.drive")}
        </div>
        <div className={rowCls}>
          <TagIcon className={iconCls} aria-hidden="true" />
          {t("dashboard.panel.tagged")}
        </div>
        <div className={rowCls}>
          <GraphIcon className={iconCls} aria-hidden="true" />
          {t("dashboard.panel.graph")}
        </div>
      </div>
      <div className="space-y-0.5 border-t border-line p-3">
        <div className={rowCls}>
          <TagsIcon className={iconCls} aria-hidden="true" />
          {t("dashboard.panel.labels")}
        </div>
        <div className={rowCls}>
          <DeleteIcon className={iconCls} aria-hidden="true" />
          {t("dashboard.panel.trash")}
        </div>
        <div className="h-9 pt-3" />
      </div>
    </div>
  );
}

/**
 * Oturum/ilk yükleme sırasında kabuğun kendisi (spec §4.1): kenar çubuğu ve
 * üst çubuk HEMEN ve gerçek haliyle çizilir (☰ mobilde yerinde); iskelet
 * yalnız içerik bölgesinde, 150ms gecikmeyle.
 */
export function DashboardShellSkeleton({ title, shape }: { title?: ReactNode; shape?: ContentSkeletonShape } = {}) {
  return (
    <div className="flex h-dvh overflow-hidden bg-canvas text-fg">
      <div aria-hidden="true" className="hidden w-60 shrink-0 flex-col border-r border-line bg-sidebar md:flex">
        <StaticSidebar />
      </div>
      <main id="content" className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ContentSkeleton title={title} shape={shape} />
      </main>
    </div>
  );
}
