import MockAdapter from 'axios-mock-adapter';
import { afterEach, describe, expect, it } from 'vitest';

import { apiClient } from '@/lib/api-client';

import { getItemQueryOptions } from '../get-item';

const minimalContent = {
  name: 'Iron Spike',
};

const minimalResponse = {
  slug: 'iron-spike',
  name: 'Iron Spike',
  itemCategory: 'adventuring-gear',
  rarity: null,
  content: minimalContent,
  contentSource: {
    type: 'srd',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Wizards of the Coast LLC',
    dataProvider: '5e-bits/5e-database',
    dataProviderUrl: 'https://github.com/5e-bits/5e-database',
  },
};

describe('getItemQueryOptions', () => {
  const mock = new MockAdapter(apiClient);

  afterEach(() => {
    mock.reset();
  });

  it('keys the cache by slug', () => {
    const opts = getItemQueryOptions('longsword');
    expect(opts.queryKey).toEqual(['items', 'detail', 'longsword']);
  });

  it('fetches the item from the API and returns the typed response', async () => {
    mock.onGet('/v1/items/iron-spike').reply(200, minimalResponse);
    const opts = getItemQueryOptions('iron-spike');
    if (!opts.queryFn) throw new Error('queryFn must be defined');
    const item = await opts.queryFn({
      queryKey: opts.queryKey,
      signal: new AbortController().signal,
      meta: undefined,
      client: undefined as never,
    });
    expect(item.slug).toBe('iron-spike');
    expect(item.content.name).toBe('Iron Spike');
    expect(item.itemCategory).toBe('adventuring-gear');
    expect(item.rarity).toBeNull();
  });
});
