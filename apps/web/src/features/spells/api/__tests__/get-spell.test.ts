import MockAdapter from 'axios-mock-adapter';
import { afterEach, describe, expect, it } from 'vitest';

import { apiClient } from '@/lib/api-client';

import { getSpellQueryOptions } from '../get-spell';

const minimalContent = {
  name: 'Light',
  level: 0,
  school: { index: 'evocation', name: 'Evocation' },
  casting_time: '1 action',
  range: 'Touch',
  components: ['V', 'M'],
  duration: '1 hour',
  concentration: false,
  desc: [
    'You touch one object that is no larger than 10 feet in any dimension.',
  ],
};

const minimalResponse = {
  slug: 'light',
  name: 'Light',
  level: 'Cantrip',
  school: 'evocation',
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

describe('getSpellQueryOptions', () => {
  const mock = new MockAdapter(apiClient);

  afterEach(() => {
    mock.reset();
  });

  it('keys the cache by slug', () => {
    const opts = getSpellQueryOptions('fireball');
    expect(opts.queryKey).toEqual(['spells', 'detail', 'fireball']);
  });

  it('parses content at the API boundary into a typed Spell', async () => {
    mock.onGet('/v1/spells/light').reply(200, minimalResponse);
    const opts = getSpellQueryOptions('light');
    if (!opts.queryFn) throw new Error('queryFn must be defined');
    const spell = await opts.queryFn({
      queryKey: opts.queryKey,
      signal: new AbortController().signal,
      meta: undefined,
      client: undefined as never,
    });
    expect(spell.slug).toBe('light');
    expect(spell.content.name).toBe('Light');
    expect(spell.content.level).toBe(0);
    expect(spell.content.components).toEqual(['V', 'M']);
  });

  it('rejects when content fails schema validation', async () => {
    mock.onGet('/v1/spells/broken').reply(200, {
      ...minimalResponse,
      slug: 'broken',
      content: { ...minimalContent, concentration: 'yes' }, // wrong type
    });
    const opts = getSpellQueryOptions('broken');
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
