"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImportIcon, SparklesIcon, FolderIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

interface OnboardingDialogProps {
  open: boolean;
  onClose: () => void;
  onPickFiles: () => void;
  /** Drive zaten bağlıysa "Pick files" adımı gösterilmez (spec §4.2). */
  driveConnected?: boolean;
  t: (key: string) => string;
}

const ONBOARDING_KEY = "onboarding_completed";

export function OnboardingDialog({
  open,
  onClose,
  onPickFiles,
  driveConnected = false,
  t,
}: OnboardingDialogProps) {
  const [step, setStep] = useState(0);

  const finish = () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(ONBOARDING_KEY, "1");
      }
    } catch {
      // ignore
    }
    onClose();
  };

  // İkonlar durağan (dekoratif nabız kaldırıldı), tek renk --fg-2.
  const iconCls = "h-8 w-8 text-fg-2";
  const steps = [
    {
      icon: <ImportIcon className={iconCls} aria-hidden="true" />,
      titleKey: "dashboard.onboardingStep1Title",
      descKey: "dashboard.onboardingStep1Desc",
    },
    {
      icon: <SparklesIcon className={iconCls} aria-hidden="true" />,
      titleKey: "dashboard.onboardingStep2Title",
      descKey: "dashboard.onboardingStep2Desc",
    },
    {
      icon: <FolderIcon className={iconCls} aria-hidden="true" />,
      titleKey: "dashboard.onboardingStep3Title",
      descKey: "dashboard.onboardingStep3Desc",
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;
  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && finish()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="items-center pr-0 text-center">
          <div className="mb-2">{current.icon}</div>
          <DialogTitle>{t(current.titleKey)}</DialogTitle>
          <DialogDescription>{t(current.descKey)}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1.5" aria-hidden="true">
          {steps.map((_, i) => (
            <span key={i} className={cn("h-1.5 w-1.5 rounded-full", i === step ? "bg-fg" : "bg-line")} />
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          {step + 1} / {steps.length}
        </p>

        <DialogFooter className="sm:justify-between">
          {/* İlk adımda geri gidilecek yer yok: "Back" yerine tanıtımı atlama. */}
          {isFirst ? (
            <Button variant="ghost" onClick={finish}>
              {t("dashboard.panel.skipIntro")}
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))}>
              {t("common.back")}
            </Button>
          )}
          {isFirst && !driveConnected ? (
            <Button
              onClick={() => {
                finish();
                onPickFiles();
              }}
            >
              {t("dashboard.connectDrive")}
            </Button>
          ) : isLast ? (
            <Button onClick={finish}>{t("dashboard.panel.done")}</Button>
          ) : (
            <Button onClick={next}>{t("common.next")}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
