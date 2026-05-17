import { describe, expect, it } from 'vitest';

import { srdItemContentSchema } from '../srd-item-content.schema';

const minimalItem = {
  name: 'Iron Spike',
};

describe('srdItemContentSchema', () => {
  it('parses a minimal valid item (just a name, no optional fields)', () => {
    const parsed = srdItemContentSchema.parse(minimalItem);
    expect(parsed.name).toBe('Iron Spike');
    expect(parsed.desc).toBeUndefined();
    expect(parsed.cost).toBeUndefined();
    expect(parsed.weight).toBeUndefined();
  });

  it('parses a weapon with cost, weight, damage, and properties', () => {
    const longsword = {
      name: 'Longsword',
      cost: { quantity: 15, unit: 'gp' },
      weight: 3,
      weapon_category: 'Martial',
      weapon_range: 'Melee',
      damage: {
        damage_dice: '1d8',
        damage_bonus: 0,
        damage_type: { index: 'slashing', name: 'Slashing' },
      },
      two_handed_damage: {
        damage_dice: '1d10',
        damage_bonus: 0,
        damage_type: { index: 'slashing', name: 'Slashing' },
      },
      properties: [{ index: 'versatile', name: 'Versatile' }],
      desc: [],
    };
    const parsed = srdItemContentSchema.parse(longsword);
    expect(parsed.cost?.quantity).toBe(15);
    expect(parsed.damage?.damage_dice).toBe('1d8');
    expect(parsed.two_handed_damage?.damage_dice).toBe('1d10');
    expect(parsed.properties).toHaveLength(1);
  });

  it('parses armor with armor_class, str_minimum, and stealth_disadvantage', () => {
    const chainMail = {
      name: 'Chain Mail',
      cost: { quantity: 75, unit: 'gp' },
      weight: 55,
      armor_category: 'Heavy',
      armor_class: { base: 16, dex_bonus: false, max_bonus: null },
      str_minimum: 13,
      stealth_disadvantage: true,
    };
    const parsed = srdItemContentSchema.parse(chainMail);
    expect(parsed.armor_class?.base).toBe(16);
    expect(parsed.armor_class?.max_bonus).toBeNull();
    expect(parsed.str_minimum).toBe(13);
    expect(parsed.stealth_disadvantage).toBe(true);
  });

  it('parses a magic item with requires_attunement and a description', () => {
    const amulet = {
      name: 'Amulet of Health',
      desc: ['Your Constitution score is 19 while you wear this amulet.'],
      requires_attunement: 'requires attunement',
    };
    const parsed = srdItemContentSchema.parse(amulet);
    expect(parsed.requires_attunement).toBe('requires attunement');
    expect(parsed.desc?.[0]).toContain('Constitution');
  });

  it('passes through unknown top-level fields (looseObject)', () => {
    const parsed = srdItemContentSchema.parse({
      ...minimalItem,
      special: ['Some weapon-specific behavior.'],
      updated_at: '2026-01-01T00:00:00Z',
    });
    expect((parsed as Record<string, unknown>)['special']).toEqual([
      'Some weapon-specific behavior.',
    ]);
  });

  it('rejects an item missing the required name field', () => {
    expect(() => srdItemContentSchema.parse({})).toThrow();
  });

  it('rejects an item with a wrong-typed weight field', () => {
    expect(() =>
      srdItemContentSchema.parse({ ...minimalItem, weight: 'heavy' }),
    ).toThrow();
  });

  it('accepts a melee weapon range with `long` omitted', () => {
    const parsed = srdItemContentSchema.parse({
      ...minimalItem,
      range: { normal: 5 },
    });
    expect(parsed.range?.normal).toBe(5);
    expect(parsed.range?.long).toBeUndefined();
  });

  it('accepts a ranged weapon range with `long` set', () => {
    const parsed = srdItemContentSchema.parse({
      ...minimalItem,
      range: { normal: 80, long: 320 },
    });
    expect(parsed.range?.normal).toBe(80);
    expect(parsed.range?.long).toBe(320);
  });
});
