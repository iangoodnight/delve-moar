import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useHoverPrefetch } from '../use-hover-prefetch';

describe('useHoverPrefetch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('fires the prefetch on pointer enter after the delay', () => {
    const prefetch = vi.fn();
    const { result } = renderHook(() => useHoverPrefetch(prefetch));

    act(() => {
      result.current.onMouseEnter();
    });
    expect(prefetch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(prefetch).toHaveBeenCalledTimes(1);
  });

  it('fires the prefetch on focus, for keyboard parity', () => {
    const prefetch = vi.fn();
    const { result } = renderHook(() => useHoverPrefetch(prefetch));

    act(() => {
      result.current.onFocus();
      vi.advanceTimersByTime(100);
    });
    expect(prefetch).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending prefetch when the pointer leaves before the delay', () => {
    const prefetch = vi.fn();
    const { result } = renderHook(() => useHoverPrefetch(prefetch));

    act(() => {
      result.current.onMouseEnter();
      vi.advanceTimersByTime(50);
      result.current.onMouseLeave();
      vi.advanceTimersByTime(100);
    });
    expect(prefetch).not.toHaveBeenCalled();
  });

  it('cancels a pending prefetch on blur', () => {
    const prefetch = vi.fn();
    const { result } = renderHook(() => useHoverPrefetch(prefetch));

    act(() => {
      result.current.onFocus();
      result.current.onBlur();
      vi.advanceTimersByTime(100);
    });
    expect(prefetch).not.toHaveBeenCalled();
  });

  it('coalesces rapid re-triggers into a single prefetch', () => {
    const prefetch = vi.fn();
    const { result } = renderHook(() => useHoverPrefetch(prefetch));

    act(() => {
      result.current.onMouseEnter();
      result.current.onFocus();
      result.current.onMouseEnter();
      vi.advanceTimersByTime(100);
    });
    expect(prefetch).toHaveBeenCalledTimes(1);
  });

  it('respects a custom delay', () => {
    const prefetch = vi.fn();
    const { result } = renderHook(() => useHoverPrefetch(prefetch, 300));

    act(() => {
      result.current.onMouseEnter();
      vi.advanceTimersByTime(100);
    });
    expect(prefetch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(prefetch).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when no prefetch is provided', () => {
    const { result } = renderHook(() => useHoverPrefetch(undefined));

    expect(() => {
      act(() => {
        result.current.onMouseEnter();
        vi.advanceTimersByTime(100);
      });
    }).not.toThrow();
  });

  it('does not fire after the element unmounts mid-hover', () => {
    const prefetch = vi.fn();
    const { result, unmount } = renderHook(() => useHoverPrefetch(prefetch));

    act(() => {
      result.current.onMouseEnter();
    });
    unmount();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(prefetch).not.toHaveBeenCalled();
  });
});
