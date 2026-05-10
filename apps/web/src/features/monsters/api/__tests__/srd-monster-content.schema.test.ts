import { describe, expect, it } from 'vitest';

import { srdMonsterContentSchema } from '../srd-monster-content.schema';

const minimalMonster = {
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

describe('srdMonsterContentSchema', () => {
  it('parses a minimal valid monster', () => {
    const parsed = srdMonsterContentSchema.parse(minimalMonster);
    expect(parsed.name).toBe('Test Monster');
    expect(parsed.armor_class[0]?.value).toBe(12);
    expect(parsed.reactions).toBeUndefined();
    expect(parsed.legendary_actions).toBeUndefined();
  });

  it('accepts optional reactions and legendary_actions when present', () => {
    const parsed = srdMonsterContentSchema.parse({
      ...minimalMonster,
      reactions: [{ name: 'Parry', desc: 'Blocks an attack.' }],
      legendary_actions: [{ name: 'Detect', desc: 'Senses surroundings.' }],
    });
    expect(parsed.reactions).toHaveLength(1);
    expect(parsed.legendary_actions?.[0]?.name).toBe('Detect');
  });

  it('passes through unknown top-level fields (looseObject)', () => {
    const parsed = srdMonsterContentSchema.parse({
      ...minimalMonster,
      proficiency_bonus: 2,
      image: '/img.png',
      forms: [],
      updated_at: '2026-01-01T00:00:00Z',
    });
    // Inferred type omits these, but the runtime value retains them so future
    // SRD shape additions don't drop data on the floor.
    expect((parsed as Record<string, unknown>)['proficiency_bonus']).toBe(2);
    expect((parsed as Record<string, unknown>)['image']).toBe('/img.png');
  });

  it('rejects a monster missing a required field', () => {
    const withoutName: Record<string, unknown> = { ...minimalMonster };
    delete withoutName['name'];
    expect(() => srdMonsterContentSchema.parse(withoutName)).toThrow();
  });

  it('rejects a monster with a wrong-typed field', () => {
    expect(() =>
      srdMonsterContentSchema.parse({
        ...minimalMonster,
        hit_points: '10', // should be a number
      }),
    ).toThrow();
  });

  it('parses a content blob shaped like the SRD Adult Red Dragon', () => {
    // Trimmed extract (real shape, fewer entries) — exercises armor_class,
    // proficiencies, condition immunities, multi-mode speed, optional senses,
    // and all four action-shaped arrays.
    const dragonish = {
      ...minimalMonster,
      name: 'Adult Red Dragon',
      size: 'Huge',
      type: 'dragon',
      alignment: 'chaotic evil',
      armor_class: [{ type: 'natural', value: 19 }],
      hit_points: 256,
      hit_dice: '19d12',
      hit_points_roll: '19d12+133',
      speed: { walk: '40 ft.', fly: '80 ft.', climb: '40 ft.' },
      proficiencies: [
        {
          value: 13,
          proficiency: {
            index: 'saving-throw-con',
            name: 'Saving Throw: CON',
            url: '/api/2014/proficiencies/saving-throw-con',
          },
        },
      ],
      damage_immunities: ['fire'],
      condition_immunities: [],
      senses: {
        blindsight: '60 ft.',
        darkvision: '120 ft.',
        passive_perception: 23,
      },
      languages: 'Common, Draconic',
      challenge_rating: 17,
      xp: 18000,
      actions: [{ name: 'Bite', desc: 'Melee Weapon Attack...' }],
      special_abilities: [
        { name: 'Legendary Resistance', desc: 'If the dragon fails...' },
      ],
      legendary_actions: [
        { name: 'Detect', desc: 'The dragon makes a Wisdom check.' },
      ],
    };
    const parsed = srdMonsterContentSchema.parse(dragonish);
    expect(parsed.challenge_rating).toBe(17);
    expect(parsed.speed.fly).toBe('80 ft.');
    expect(parsed.senses.passive_perception).toBe(23);
    expect(parsed.legendary_actions).toHaveLength(1);
  });
});
