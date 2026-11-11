"use client";

import { useId, useState } from "react";
import { ArrowRightIcon, SuccessIcon, HelpIcon, ResetIcon, XCircleIcon } from "@/components/icons";
import { TransitionLink } from "@/components/motion/transition-link";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_CHOICES,
  EDITION_CHOICES,
  EMPTY_ANSWERS,
  checkerSourceAnchor,
  checkerSourceNumber,
  chooseAccount,
  chooseEdition,
  chooseLabelsInDrive,
  evaluateChecker,
  type AccountKind,
  type CheckerAnswers,
  type CheckerFact,
  type CheckerResult,
  type CheckerStatus,
  type LabelsInDrive,
} from "@/lib/marketing/drive-labels-checker";

/**
 * "Does my Google account have Drive Labels?" aracı.
 *
 * Gizlilik sözü koddadır: bileşen yalnız React durumu (bellek) kullanır. Ağ isteği, çerez, localStorage,
 * sessionStorage ya da Google API çağrısı YOK; cevaplar adrese de yazılmaz (tests/unit/
 * drive-labels-checker.test.ts bu kaynağı tarar).
 */

const STATUS_STYLE: Record<Exclude<CheckerStatus, "incomplete">, { icon: typeof XCircleIcon; ring: string; iconClass: string; label: string }> = {
  unavailable: {
    icon: XCircleIcon,
    ring: "border-rose-500/40 bg-rose-500/10",
    iconClass: "text-rose-700 dark:text-rose-400",
    label: "Result: not available",
  },
  possible: {
    icon: SuccessIcon,
    ring: "border-emerald-500/40 bg-emerald-500/10",
    iconClass: "text-emerald-700 dark:text-emerald-400",
    label: "Result: possible",
  },
  unclear: {
    icon: HelpIcon,
    ring: "border-brand-ocean/50 bg-brand-ocean/10",
    iconClass: "text-brand-ocean-ink",
    label: "Result: not sure yet",
  },
};

interface ChoiceProps {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  hint?: string;
  onChange: (value: string) => void;
}

function Choice({ name, value, checked, label, hint, onChange }: ChoiceProps) {
  const id = useId();
  return (
    <div>
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className={cn(
          "block cursor-pointer rounded-xl border border-border/70 bg-card/70 p-4 text-left transition-colors",
          "hover:bg-muted/60 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
          "peer-checked:border-brand-ocean peer-checked:bg-brand-ocean/10",
        )}
      >
        <span className="block font-semibold">{label}</span>
        {hint && <span className="mt-1 block text-sm text-muted-foreground">{hint}</span>}
      </label>
    </div>
  );
}

function Fact({ fact }: { fact: CheckerFact }) {
  return (
    <li>
      {fact.text}
      {fact.sourceId && (
        <sup className="ml-0.5">
          <a
            href={`#${checkerSourceAnchor(fact.sourceId)}`}
            className="text-brand-ocean-ink hover:underline"
            aria-label={`Source ${checkerSourceNumber(fact.sourceId)}`}
          >
            [{checkerSourceNumber(fact.sourceId)}]
          </a>
        </sup>
      )}
    </li>
  );
}

export interface CheckerResultCardProps {
  result: CheckerResult;
  labelsInDrive: LabelsInDrive | null;
  onLabelsInDrive: (value: string) => void;
  groupId: string;
}

/** Sonuç kartı (sunum): sonuç ve cevap verilir, kendi durumu yoktur; testte doğrudan işlenir. */
export function CheckerResultCard({ result, labelsInDrive, onLabelsInDrive, groupId }: CheckerResultCardProps) {
  if (result.status === "incomplete") return null;
  const style = STATUS_STYLE[result.status];
  const Icon = style.icon;
  return (
    <div className={cn("rounded-2xl border p-5 md:p-6", style.ring)} data-testid="checker-result" data-status={result.status}>
      <div className="mb-3 flex items-start gap-3">
        <Icon className={cn("mt-1 h-6 w-6 shrink-0", style.iconClass)} aria-hidden="true" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{style.label}</p>
          <h3 className="text-xl font-bold tracking-tight md:text-2xl">{result.headline}</h3>
        </div>
      </div>
      <p className="mb-4 text-foreground/90">{result.summary}</p>

      <h4 className="mb-2 text-sm font-semibold">What Google says</h4>
      <ul className="mb-5 list-disc space-y-1.5 pl-5 text-sm text-foreground/90 marker:text-brand-ocean-ink">
        {result.facts.map((fact) => (
          <Fact key={fact.text} fact={fact} />
        ))}
      </ul>

      {result.asksLabelsInDrive && (
        <fieldset className="mb-5">
          <legend className="mb-2 text-sm font-semibold">Do you see Labels when you right-click a file in Drive on a computer?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice
              name={`${groupId}-labels`}
              value="yes"
              checked={labelsInDrive === "yes"}
              label="Yes, I see Labels"
              onChange={onLabelsInDrive}
            />
            <Choice
              name={`${groupId}-labels`}
              value="no"
              checked={labelsInDrive === "no"}
              label="No, there is no Labels item"
              onChange={onLabelsInDrive}
            />
          </div>
        </fieldset>
      )}

      <h4 className="mb-2 text-sm font-semibold">What to do next</h4>
      <ul className="mb-5 list-disc space-y-1.5 pl-5 text-sm text-foreground/90 marker:text-brand-ocean-ink">
        {result.nextSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>

      {result.options.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">{result.status === "possible" ? "And if they don't fit" : "Your options"}</h4>
          <ul className="space-y-3">
            {result.options.map((option) => (
              <li key={option.title} className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm">
                <p className="font-semibold">{option.title}</p>
                <p className="mt-1 text-foreground/90">{option.text}</p>
                {option.href && (
                  <TransitionLink
                    href={option.href}
                    className="group mt-2 inline-flex items-center gap-1.5 font-semibold text-brand-ocean-ink"
                  >
                    <span className="underline underline-offset-4 group-hover:no-underline">{option.linkLabel ?? "Read more"}</span>
                    <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                  </TransitionLink>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function DriveLabelsChecker() {
  const groupId = useId();
  const [answers, setAnswers] = useState<CheckerAnswers>(EMPTY_ANSWERS);
  const result = evaluateChecker(answers);
  const showEdition = answers.account === "workspace";

  const setAccount = (value: string) => setAnswers((prev) => chooseAccount(prev, value as AccountKind));
  const setEdition = (value: string) => setAnswers((prev) => chooseEdition(prev, value));
  const setLabelsInDrive = (value: string) => setAnswers((prev) => chooseLabelsInDrive(prev, value as LabelsInDrive));

  return (
    <section aria-labelledby={`${groupId}-title`} className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-lg md:p-8">
      <h2 id={`${groupId}-title`} className="sr-only">
        Drive Labels checker
      </h2>

      <fieldset className="mb-8">
        <legend className="mb-3 text-lg font-semibold">1. What kind of Google account is it?</legend>
        <div className="grid gap-3 md:grid-cols-3">
          {ACCOUNT_CHOICES.map((choice) => (
            <Choice
              key={choice.id}
              name={`${groupId}-account`}
              value={choice.id}
              checked={answers.account === choice.id}
              label={choice.label}
              hint={choice.hint}
              onChange={setAccount}
            />
          ))}
        </div>
      </fieldset>

      {showEdition && (
        <div className="mb-8">
          <label htmlFor={`${groupId}-edition`} className="mb-3 block text-lg font-semibold">
            2. Which Google Workspace edition?
          </label>
          <select
            id={`${groupId}-edition`}
            value={answers.edition ?? ""}
            onChange={(e) => setEdition(e.target.value)}
            className="h-11 w-full rounded-lg border border-control bg-raised px-3 text-base md:max-w-sm"
          >
            <option value="" disabled>
              Choose an edition
            </option>
            {EDITION_CHOICES.map((edition) => (
              <option key={edition.id} value={edition.id}>
                {edition.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-muted-foreground">
            Your Workspace admin knows the edition. Not sure? Choose &quot;Another edition, or I don&apos;t know&quot;.
          </p>
        </div>
      )}

      {/* Ekran okuyucuya yalnız başlık okunur; kartın tamamı her tıklamada yeniden okunmaz. */}
      <div className="sr-only" role="status" aria-live="polite">
        {result.status === "incomplete" ? "" : result.headline}
      </div>

      {result.status === "incomplete" ? (
        <p className="rounded-2xl border border-dashed border-border/80 p-5 text-muted-foreground">
          {answers.account === "workspace"
            ? "Choose your edition to see the result."
            : "Choose an account type to see the result. Your answers stay on this page."}
        </p>
      ) : (
        <CheckerResultCard result={result} labelsInDrive={answers.labelsInDrive} onLabelsInDrive={setLabelsInDrive} groupId={groupId} />
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>This check runs in your browser. It doesn&apos;t sign in to Google or read your Drive, and your answers aren&apos;t sent or saved.</p>
        {answers.account !== null && (
          <button
            type="button"
            onClick={() => setAnswers(EMPTY_ANSWERS)}
            className="inline-flex items-center gap-1.5 rounded-md border border-control bg-raised px-3 py-1.5 font-medium text-foreground hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ResetIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Start over
          </button>
        )}
      </div>
    </section>
  );
}
