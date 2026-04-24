import { describe, expect, it } from 'vitest';

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
