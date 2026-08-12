import { useCallback, useEffect, useRef } from 'react';

interface HoverPrefetchHandlers {
  readonly onBlur: () => void;
  readonly onFocus: () => void;
  readonly onMouseEnter: () => void;
  readonly onMouseLeave: () => void;
}

// a short delay filters accidental fly-overs from a fast cursor sweep
const DEFAULT_DELAY_MS = 100;

// spread the returned handlers onto a link/card; undefined disables it
export function useHoverPrefetch(
  prefetch: (() => void) | undefined,
  delayMs: number = DEFAULT_DELAY_MS,
): HoverPrefetchHandlers {
  const prefetchRef = useRef(prefetch);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    prefetchRef.current = prefetch;
  }, [prefetch]);

  const cancel = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const schedule = useCallback(() => {
    if (prefetchRef.current === undefined) {
      return;
    }
    cancel();
    timerRef.current = setTimeout(() => {
      timerRef.current = undefined;
      prefetchRef.current?.();
    }, delayMs);
  }, [cancel, delayMs]);

  // clear a pending timer if the element unmounts mid-hover.
  useEffect(() => cancel, [cancel]);

  return {
    onBlur: cancel,
    onFocus: schedule,
    onMouseEnter: schedule,
    onMouseLeave: cancel,
  };
}
