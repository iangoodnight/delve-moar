import MockAdapter from 'axios-mock-adapter';
import { afterEach, describe, expect, it } from 'vitest';

import { apiClient } from '@/lib/api-client';

import { getMonsterQueryOptions } from '../get-monster';

const minimalContent = {
  name: 'Test Monster',
  size: 'Medium',
  type: 'humanoid',
  alignment: 'neutral',
  armorClass: [{ type: 'natural', value: 12 }],
  hitPoints: 10,
  hitDice: '1d8',
  speed: { walk: '30 ft.' },
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  proficiencies: [],
  damageImmunities: [],
  damageResistances: [],
  damageVulnerabilities: [],
  conditionImmunities: [],
  senses: { passivePerception: 10 },
  languages: 'Common',
  challengeRating: 0,
  xp: 0,
  actions: [],
  specialAbilities: [],
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

  it('fetches the monster from the API and returns the typed response', async () => {
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
    expect(monster.content.armorClass[0]?.value).toBe(12);
  });
});
