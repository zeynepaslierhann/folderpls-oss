"use client";

import { forwardRef, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { navigateWithTransition, shouldAnimateNavigation } from "@/lib/motion/view-transition";

type TransitionLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean | null;
  children?: ReactNode;
};

/**
 * Drop-in `next/link` replacement that animates same-origin page changes with
 * the View Transitions API. Falls back to a normal Link click everywhere else
 * (unsupported browser, reduced motion, modifier keys, new tab, same page).
 */
export const TransitionLink = forwardRef<HTMLAnchorElement, TransitionLinkProps>(function TransitionLink(
  { href, replace, scroll, prefetch, onClick, target, download, ...rest },
  ref,
) {
  const router = useRouter();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (!shouldAnimateNavigation(event, href, window.location, target, download !== undefined && download !== false)) {
      return;
    }
    event.preventDefault();
    navigateWithTransition(() => {
      if (replace) router.replace(href, { scroll });
      else router.push(href, { scroll });
    });
  };

  return (
    <Link
      ref={ref}
      href={href}
      replace={replace}
      scroll={scroll}
      prefetch={prefetch}
      target={target}
      download={download}
      onClick={handleClick}
      {...rest}
    />
  );
});
