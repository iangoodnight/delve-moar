import { describe, expect, it } from 'vitest';

import type { ItemListResponse } from '../get-items';
import { getItemsInfiniteQueryOptions } from '../get-items';

function makePage(
  count: number,
  offset: number,
  limit: number,
): ItemListResponse {
  return {
    data: [],
    metadata: {
      resultset: { count, offset, limit },
      links: { prev: null, next: null },
    },
  };
}

describe('getItemsInfiniteQueryOptions', () => {
  it('keys the cache by filter object', () => {
    const opts = getItemsInfiniteQueryOptions({
      search: 'sword',
      category: 'weapon',
      rarity: 'rare',
    });
    expect(opts.queryKey).toEqual([
      'items',
      'list',
      { search: 'sword', category: 'weapon', rarity: 'rare' },
    ]);
  });

  it('starts pagination at offset 0', () => {
    const opts = getItemsInfiniteQueryOptions({});
    expect(opts.initialPageParam).toBe(0);
  });

  it('returns the next offset when more records exist', () => {
    const opts = getItemsInfiniteQueryOptions({});
    const lastPage = makePage(100, 0, 20);
    const next = opts.getNextPageParam(lastPage, [lastPage], 0, [0]);
    expect(next).toBe(20);
  });

  it('returns undefined when the resultset is exhausted', () => {
    const opts = getItemsInfiniteQueryOptions({});
    const lastPage = makePage(20, 0, 20);
    const next = opts.getNextPageParam(lastPage, [lastPage], 0, [0]);
    expect(next).toBeUndefined();
  });

  it('returns undefined when count equals offset+limit exactly', () => {
    const opts = getItemsInfiniteQueryOptions({});
    const lastPage = makePage(40, 20, 20);
    const next = opts.getNextPageParam(lastPage, [lastPage], 20, [0, 20]);
    expect(next).toBeUndefined();
  });
});
