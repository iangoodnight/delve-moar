import { queryOptions } from '@tanstack/react-query';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { QueryConfig } from '../react-query';
import { queryConfig } from '../react-query';

describe('queryConfig', () => {
  it('exposes the expected query defaults', () => {
    expect(queryConfig.queries).toEqual({
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    });
  });
});

describe('QueryConfig', () => {
  it('accepts a queryOptions factory and preserves passthrough keys', () => {
    const factory = (slug: string) =>
      queryOptions({
        queryKey: ['x', slug] as const,
        queryFn: () => Promise.resolve({ slug }),
      });

    type Config = QueryConfig<typeof factory>;

    expectTypeOf(factory).toBeFunction();
    expectTypeOf<Config>().toHaveProperty('staleTime');
    expectTypeOf<Config>().toHaveProperty('gcTime');
    expectTypeOf<Config>().not.toHaveProperty('queryKey');
    expectTypeOf<Config>().not.toHaveProperty('queryFn');
  });
});
