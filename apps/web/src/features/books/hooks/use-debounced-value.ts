import { useEffect, useState } from 'react';

// Trails `value` by `delayMs`, so a fast typist fires one query, not one per
// keystroke. Re-initializes to the current value on mount (no startup delay).
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
}
