import { describe, expect, it } from 'vitest';

import type { SpellListResponse } from '../get-spells';
import { getSpellsInfiniteQueryOptions } from '../get-spells';

function makePage(
  count: number,
  offset: number,
  limit: number,
): SpellListResponse {
  return {
    data: [],
    metadata: {
      resultset: { count, offset, limit },
      links: { prev: null, next: null },
    },
  };
}

describe('getSpellsInfiniteQueryOptions', () => {
  it('keys the cache by filter object', () => {
    const opts = getSpellsInfiniteQueryOptions({
      search: 'fire',
      school: 'evocation',
    });
    expect(opts.queryKey).toEqual([
      'spells',
      'list',
      { search: 'fire', school: 'evocation' },
    ]);
  });

  it('starts pagination at offset 0', () => {
    const opts = getSpellsInfiniteQueryOptions({});
    expect(opts.initialPageParam).toBe(0);
  });

  it('returns the next offset when more records exist', () => {
    const opts = getSpellsInfiniteQueryOptions({});
    const lastPage = makePage(100, 0, 20);
    const next = opts.getNextPageParam(lastPage, [lastPage], 0, [0]);
    expect(next).toBe(20);
  });

  it('returns undefined when the resultset is exhausted', () => {
    const opts = getSpellsInfiniteQueryOptions({});
    const lastPage = makePage(20, 0, 20);
    const next = opts.getNextPageParam(lastPage, [lastPage], 0, [0]);
    expect(next).toBeUndefined();
  });

  it('returns undefined when count equals offset+limit exactly', () => {
    const opts = getSpellsInfiniteQueryOptions({});
    const lastPage = makePage(40, 20, 20);
    const next = opts.getNextPageParam(lastPage, [lastPage], 20, [0, 20]);
    expect(next).toBeUndefined();
  });
});
