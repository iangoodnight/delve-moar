import { describe, expect, it } from 'vitest';

import { srdSpellContentSchema } from '../srd-spell-content.schema';

const minimalSpell = {
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

describe('srdSpellContentSchema', () => {
  it('parses a minimal valid spell (cantrip, no optional fields)', () => {
    const parsed = srdSpellContentSchema.parse(minimalSpell);
    expect(parsed.name).toBe('Light');
    expect(parsed.level).toBe(0);
    expect(parsed.concentration).toBe(false);
    expect(parsed.material).toBeUndefined();
    expect(parsed.higher_level).toBeUndefined();
    expect(parsed.classes).toBeUndefined();
    expect(parsed.ritual).toBeUndefined();
  });

  it('parses optional fields when present', () => {
    const parsed = srdSpellContentSchema.parse({
      ...minimalSpell,
      material: 'A tiny ball of bat guano and sulfur',
      ritual: false,
      higher_level: ['Extra damage per slot above 3rd.'],
      classes: [{ index: 'wizard', name: 'Wizard' }],
    });
    expect(parsed.material).toBe('A tiny ball of bat guano and sulfur');
    expect(parsed.higher_level).toHaveLength(1);
    expect(parsed.classes?.[0]?.name).toBe('Wizard');
  });

  it('passes through unknown top-level fields (looseObject)', () => {
    const parsed = srdSpellContentSchema.parse({
      ...minimalSpell,
      subclasses: [],
      updated_at: '2026-01-01T00:00:00Z',
    });
    expect((parsed as Record<string, unknown>)['subclasses']).toEqual([]);
  });

  it('rejects a spell missing a required field', () => {
    const withoutDesc: Record<string, unknown> = { ...minimalSpell };
    delete withoutDesc['desc'];
    expect(() => srdSpellContentSchema.parse(withoutDesc)).toThrow();
  });

  it('rejects a spell with a wrong-typed concentration field', () => {
    expect(() =>
      srdSpellContentSchema.parse({
        ...minimalSpell,
        concentration: 'yes',
      }),
    ).toThrow();
  });

  it('parses a fireball-shaped SRD payload', () => {
    const fireball = {
      ...minimalSpell,
      name: 'Fireball',
      level: 3,
      school: { index: 'evocation', name: 'Evocation' },
      casting_time: '1 action',
      range: '150 feet',
      components: ['V', 'S', 'M'],
      material: 'A tiny ball of bat guano and sulfur',
      duration: 'Instantaneous',
      concentration: false,
      desc: ['A bright streak flashes...', 'The fire spreads around corners.'],
      higher_level: ['Damage increases by 1d6 per slot above 3rd.'],
      classes: [
        { index: 'sorcerer', name: 'Sorcerer' },
        { index: 'wizard', name: 'Wizard' },
      ],
    };
    const parsed = srdSpellContentSchema.parse(fireball);
    expect(parsed.level).toBe(3);
    expect(parsed.components).toEqual(['V', 'S', 'M']);
    expect(parsed.classes).toHaveLength(2);
    expect(parsed.higher_level?.[0]).toContain('1d6');
  });
});
