import MockAdapter from 'axios-mock-adapter';
import { afterEach, describe, expect, it } from 'vitest';

import { apiClient } from '@/lib/api-client';

import { getMonsterQueryOptions } from '../get-monster';

const minimalContent = {
  name: 'Test Monster',
  size: 'Medium',
  type: 'humanoid',
  alignment: 'neutral',
  armor_class: [{ type: 'natural', value: 12 }],
  hit_points: 10,
  hit_dice: '1d8',
  speed: { walk: '30 ft.' },
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  proficiencies: [],
  damage_immunities: [],
  damage_resistances: [],
  damage_vulnerabilities: [],
  condition_immunities: [],
  senses: { passive_perception: 10 },
  languages: 'Common',
  challenge_rating: 0,
  xp: 0,
  actions: [],
  special_abilities: [],
};

const minimalResponse = {
  slug: 'test-monster',
  name: 'Test Monster',
  monsterType: 'humanoid',
  challengeRating: '0',
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

describe('getMonsterQueryOptions', () => {
  const mock = new MockAdapter(apiClient);

  afterEach(() => {
    mock.reset();
  });

  it('keys the cache by slug', () => {
    const opts = getMonsterQueryOptions('adult-red-dragon');
    expect(opts.queryKey).toEqual(['monsters', 'detail', 'adult-red-dragon']);
  });

  it('parses content at the API boundary into a typed Monster', async () => {
    mock.onGet('/v1/monsters/test-monster').reply(200, minimalResponse);
    const opts = getMonsterQueryOptions('test-monster');
    if (!opts.queryFn) throw new Error('queryFn must be defined');
    const monster = await opts.queryFn({
      queryKey: opts.queryKey,
      signal: new AbortController().signal,
      meta: undefined,
      client: undefined as never,
    });
    expect(monster.slug).toBe('test-monster');
    expect(monster.content.name).toBe('Test Monster');
    expect(monster.content.armor_class[0]?.value).toBe(12);
  });

  it('rejects when content fails schema validation', async () => {
    mock.onGet('/v1/monsters/broken').reply(200, {
      ...minimalResponse,
      slug: 'broken',
      content: { ...minimalContent, hit_points: 'ten' }, // wrong type
    });
    const opts = getMonsterQueryOptions('broken');
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
