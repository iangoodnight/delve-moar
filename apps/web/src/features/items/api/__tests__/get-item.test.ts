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
    license_url: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Wizards of the Coast LLC',
    data_provider: '5e-bits/5e-database',
    data_provider_url: 'https://github.com/5e-bits/5e-database',
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

  it('parses content at the API boundary into a typed Item', async () => {
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

  it('rejects when content fails schema validation', async () => {
    mock.onGet('/v1/items/broken').reply(200, {
      ...minimalResponse,
      slug: 'broken',
      content: { ...minimalContent, weight: 'heavy' }, // wrong type
    });
    const opts = getItemQueryOptions('broken');
    if (!opts.queryFn) throw new Error('queryFn must be defined');
    await expect(
      opts.queryFn({
        queryKey: opts.queryKey,
        signal: new AbortController().signal,
        meta: undefined,
        client: undefined as never,
      }),
    ).rejects.toThrow();
  });
});
