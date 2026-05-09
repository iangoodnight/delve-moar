import { describe, expect, it } from 'vitest';

import type { MonsterListResponse } from '../get-monsters';
import { getMonstersInfiniteQueryOptions } from '../get-monsters';

function makePage(
  count: number,
  offset: number,
  limit: number,
): MonsterListResponse {
  return {
    data: [],
    metadata: {
      resultset: { count, offset, limit },
      links: { prev: null, next: null },
    },
  };
}

describe('getMonstersInfiniteQueryOptions', () => {
  it('keys the cache by filter object', () => {
    const opts = getMonstersInfiniteQueryOptions({
      search: 'dragon',
      type: 'monstrosity',
    });
    expect(opts.queryKey).toEqual([
      'monsters',
      'list',
      { search: 'dragon', type: 'monstrosity' },
    ]);
  });

  it('starts pagination at offset 0', () => {
    const opts = getMonstersInfiniteQueryOptions({});
    expect(opts.initialPageParam).toBe(0);
  });

  it('returns the next offset when more records exist', () => {
    const opts = getMonstersInfiniteQueryOptions({});
    const lastPage = makePage(100, 0, 20);
    // TanStack Query passes (lastPage, allPages, lastPageParam, allPageParams);
    // our implementation only reads lastPage so the rest are placeholders.
    const next = opts.getNextPageParam(lastPage, [lastPage], 0, [0]);
    expect(next).toBe(20);
  });

  it('returns undefined when the resultset is exhausted', () => {
    const opts = getMonstersInfiniteQueryOptions({});
    const lastPage = makePage(20, 0, 20);
    const next = opts.getNextPageParam(lastPage, [lastPage], 0, [0]);
    expect(next).toBeUndefined();
  });

  it('returns undefined when the count equals offset+limit exactly', () => {
    // Boundary case — exactly one full page, no more records to fetch.
    const opts = getMonstersInfiniteQueryOptions({});
    const lastPage = makePage(40, 20, 20);
    const next = opts.getNextPageParam(lastPage, [lastPage], 20, [0, 20]);
    expect(next).toBeUndefined();
  });
});
