import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { PrefetchRegistry } from '@/lib/prefetch';
import { PrefetchRegistryProvider, usePathPrefetch } from '@/lib/prefetch';
import { createTestQueryClient } from '@/testing/setup';

function createWrapper(
  registry: PrefetchRegistry,
  queryClient = createTestQueryClient(),
) {
  return function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <QueryClientProvider client={queryClient}>
        <PrefetchRegistryProvider registry={registry}>
          {children}
        </PrefetchRegistryProvider>
      </QueryClientProvider>
    );
  };
}

describe('usePathPrefetch', () => {
  it('returns undefined for an unregistered path', () => {
    const { result } = renderHook(() => usePathPrefetch('/nope'), {
      wrapper: createWrapper({}),
    });

    expect(result.current).toBeUndefined();
  });

  it('binds the registered prefetch to the query client', () => {
    const prefetch = vi.fn();
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => usePathPrefetch('/monsters'), {
      wrapper: createWrapper({ '/monsters': prefetch }, queryClient),
    });

    expect(result.current).toBeTypeOf('function');
    result.current?.();
    expect(prefetch).toHaveBeenCalledWith(queryClient);
  });
});
