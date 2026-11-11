/**
 * Zero-dependency View Transitions for Next.js client navigations.
 *
 * `document.startViewTransition` snapshots the old page, runs our callback and
 * animates to the new DOM once the callback's promise resolves. A client-side
 * `router.push` commits asynchronously, so the promise is resolved by
 * <MotionRuntime> when the pathname actually changes (with a safety timeout).
 */

export interface NavigationClick {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
}

export interface LocationLike {
  origin: string;
  pathname: string;
}

/** Longest we keep the old page frozen if the new route is slow to commit. */
export const VIEW_TRANSITION_TIMEOUT_MS = 1200;

/**
 * Pure decision: should this click become an animated in-app navigation?
 * Only plain left clicks to another same-origin path qualify; modifier clicks,
 * new tabs, downloads, hash jumps and external links keep native behaviour.
 */
export function shouldAnimateNavigation(
  click: NavigationClick,
  href: string,
  location: LocationLike,
  target?: string | null,
  download?: boolean,
): boolean {
  if (click.defaultPrevented || click.button !== 0) return false;
  if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return false;
  if (download) return false;
  if (target && target !== "_self") return false;

  let url: URL;
  try {
    url = new URL(href, location.origin);
  } catch {
    return false;
  }
  if (url.origin !== location.origin) return false;
  // Same page (e.g. "/#faq" while on "/"): nothing to transition between.
  if (url.pathname === location.pathname) return false;
  return true;
}

let pending: (() => void) | null = null;

/** Called once the new route has committed (pathname changed). */
export function resolvePendingViewTransition(): void {
  const done = pending;
  pending = null;
  done?.();
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Runs `navigate` inside a view transition when the browser supports it. */
export function navigateWithTransition(navigate: () => void): void {
  if (typeof document === "undefined" || typeof document.startViewTransition !== "function" || prefersReducedMotion()) {
    navigate();
    return;
  }
  // A second click while one transition is pending: settle the first.
  resolvePendingViewTransition();
  document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        const finish = () => {
          window.clearTimeout(timer);
          if (pending === finish) pending = null;
          resolve();
        };
        const timer = window.setTimeout(finish, VIEW_TRANSITION_TIMEOUT_MS);
        pending = finish;
        navigate();
      }),
  );
}
