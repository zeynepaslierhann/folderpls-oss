"use client";

import { ArrowRightIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { TransitionLink } from "@/components/motion/transition-link";

/** /demo -> gerçek panel bağlantısı; hesap istemez. */
export function DemoSignupLink({ variant = "button", children }: { variant?: "button" | "text"; children: string }) {
  const href = "/dashboard";
  if (variant === "text") {
    return (
      <TransitionLink href={href} className="font-medium underline underline-offset-4 hover:no-underline">
        {children}
      </TransitionLink>
    );
  }
  return (
    <Button asChild size="md" className="gap-1.5">
      <TransitionLink href={href}>
        {children}
        <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
      </TransitionLink>
    </Button>
  );
}
