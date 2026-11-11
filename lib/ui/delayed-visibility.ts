/**
 * Gecikmeli görünürlük — tek yükleme sisteminin zamanlama çekirdeği
 * (spec §4.1). React'tan bağımsızdır; hook (useDelayedVisible) ve testler
 * bunu kullanır.
 *
 * - `delay` ms dolmadan biten yüklemede gösterge HİÇ görünmez (titreme yok).
 * - Gösterge bir kez göründüyse en az `minVisible` ms kalır (yanıp sönme yok).
 */
export interface DelayedVisibilityOptions {
  delay?: number;
  minVisible?: number;
}

export interface DelayedVisibilityTimers {
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
}

export const DEFAULT_LOADING_DELAY_MS = 150;
export const DEFAULT_LOADING_MIN_VISIBLE_MS = 300;

export function createDelayedVisibility(
  onChange: (visible: boolean) => void,
  { delay = DEFAULT_LOADING_DELAY_MS, minVisible = DEFAULT_LOADING_MIN_VISIBLE_MS }: DelayedVisibilityOptions = {},
  timers: DelayedVisibilityTimers = {
    now: () => Date.now(),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  }
) {
  let visible = false;
  let shownAt = 0;
  let timer: unknown = null;

  const clear = () => {
    if (timer !== null) timers.clearTimeout(timer);
    timer = null;
  };
  const show = () => {
    timer = null;
    visible = true;
    shownAt = timers.now();
    onChange(true);
  };
  const hide = () => {
    timer = null;
    visible = false;
    onChange(false);
  };

  return {
    update(loading: boolean) {
      clear();
      if (loading) {
        if (!visible) timer = timers.setTimeout(show, delay);
        return;
      }
      if (!visible) return;
      const remaining = minVisible - (timers.now() - shownAt);
      if (remaining <= 0) hide();
      else timer = timers.setTimeout(hide, remaining);
    },
    dispose: clear,
    get visible() {
      return visible;
    },
  };
}

/**
 * Yükleme sırasında düğme genişliği kilitlenir: metin "Save" → "Saving…"
 * olurken ya da ikon spinner'a dönerken düğme zıplamaz.
 */
export function lockedWidthStyle(loading: boolean, measuredWidth: number | null): { minWidth?: number } {
  return loading && measuredWidth && measuredWidth > 0 ? { minWidth: measuredWidth } : {};
}
