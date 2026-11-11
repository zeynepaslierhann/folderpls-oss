"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { IconComponent } from "@/components/icons";
import { AlertIcon, CloseIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: IconComponent;
  title: string;
  body?: string;
  /** En fazla bir eylem (spec §4.2). */
  action?: ReactNode;
  className?: string;
}

/**
 * Boş durum (spec §4.2): ortalanmış, en fazla 360px; 32px çizgi ikon (--fg-3),
 * text-lg başlık, tek cümle (text-sm --fg-2), en fazla bir düğme.
 * İllüstrasyon ya da maskot yok.
 */
export function EmptyState({ icon: Icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-1 items-center justify-center px-4 py-16", className)}>
      <div className="flex max-w-[360px] flex-col items-center text-center">
        <Icon className="mb-3 h-8 w-8 text-fg-3" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-fg">{title}</h2>
        {body && <p className="mt-1 text-sm text-fg-2">{body}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

interface ErrorStateProps {
  title: string;
  body: string;
  /** Teknik ayrıntı (hata metni); "Details" ile açılır. */
  details?: string | null;
  onRetry?: () => void;
  retryLabel: string;
  detailsLabel: string;
  className?: string;
}

/**
 * Bölge yüklenemedi (spec §4.3): boş durumla aynı yerleşim, ikon --danger,
 * Try again (primary) + Details. Üst çubuk yerinde kalır; hata ile boş durum
 * aynı anda görünmez (çağıran ikisinden birini çizer).
 */
export function ErrorState({ title, body, details, onRetry, retryLabel, detailsLabel, className }: ErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);
  return (
    <div role="alert" className={cn("flex flex-1 items-center justify-center px-4 py-16", className)}>
      <div className="flex max-w-[360px] flex-col items-center text-center">
        <AlertIcon className="mb-3 h-8 w-8 text-danger" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-fg">{title}</h2>
        <p className="mt-1 text-sm text-fg-2">{body}</p>
        <div className="mt-4 flex items-center gap-2">
          {onRetry && (
            <Button size="md" onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
          {details && (
            <Button variant="link" size="md" onClick={() => setShowDetails((v) => !v)} aria-expanded={showDetails}>
              {detailsLabel}
            </Button>
          )}
        </div>
        {showDetails && details && <p className="mt-3 break-words text-sm text-fg-3">{details}</p>}
      </div>
    </div>
  );
}

interface NoticeProps {
  tone?: "warning" | "danger";
  children: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  action?: ReactNode;
}

/**
 * Kalıcı hesap/kapsam durumu ve eylem hatası şeridi (spec §4.3): içerik
 * üstünde tam genişlik, %8 tint zemin, --r-md. Giriş animasyonu yok.
 */
export function Notice({ tone = "warning", children, onDismiss, dismissLabel = "Dismiss", action }: NoticeProps) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "mx-4 mt-3 flex items-center gap-3 rounded-md px-3 py-2 text-sm",
        tone === "danger" ? "bg-danger/8 text-danger" : "bg-warning/8 text-warning"
      )}
    >
      <span className="min-w-0 flex-1">{children}</span>
      {action}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-hover"
        >
          <CloseIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

interface ToastProps {
  tone?: "neutral" | "danger";
  children: ReactNode;
  onDismiss: () => void;
  dismissLabel: string;
  action?: ReactNode;
  /** ms; hata için biraz daha uzun. */
  duration?: number;
}

/**
 * Eylem sonucu bildirimi (spec §4.3): sağ altta, --raised, --shadow-pop,
 * tek kayıt; hata ise role="alert". Süre dolunca kendiliğinden kapanır.
 */
export function Toast({ tone = "neutral", children, onDismiss, dismissLabel, action, duration }: ToastProps) {
  const ms = duration ?? (tone === "danger" ? 6000 : 4000);
  useEffect(() => {
    const id = setTimeout(onDismiss, ms);
    return () => clearTimeout(id);
  }, [onDismiss, ms, children]);
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className="fixed bottom-4 right-4 z-[120] flex max-w-[calc(100vw-32px)] items-center gap-3 rounded-lg bg-raised py-2 pl-4 pr-2 text-sm text-fg shadow-pop sm:max-w-sm"
    >
      {tone === "danger" && <AlertIcon className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" />}
      <span className="min-w-0 flex-1">{children}</span>
      {action}
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissLabel}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg"
      >
        <CloseIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
