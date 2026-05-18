import { describe, expect, it } from 'vitest';

import {
  formatArmorClass,
  formatModifier,
  formatProficiency,
  formatProficiencyList,
  formatReferenceList,
  formatSenses,
  formatSignedNumber,
  formatSpeed,
  formatXp,
  partitionProficiencies,
} from '../format';

describe('formatModifier', () => {
  it('produces signed modifiers per the 5e formula floor((score - 10) / 2)', () => {
    expect(formatModifier(10)).toBe('+0');
    expect(formatModifier(11)).toBe('+0');
    expect(formatModifier(16)).toBe('+3');
    expect(formatModifier(27)).toBe('+8');
    expect(formatModifier(8)).toBe('-1');
    expect(formatModifier(1)).toBe('-5');
  });
});

describe('formatSignedNumber', () => {
  it('renders zero and positives with a leading +', () => {
    expect(formatSignedNumber(0)).toBe('+0');
    expect(formatSignedNumber(6)).toBe('+6');
    expect(formatSignedNumber(-2)).toBe('-2');
  });
});

describe('formatXp', () => {
  it('groups thousands with commas (en-US)', () => {
    expect(formatXp(0)).toBe('0');
    expect(formatXp(450)).toBe('450');
    expect(formatXp(18000)).toBe('18,000');
    expect(formatXp(155000)).toBe('155,000');
  });
});

describe('formatArmorClass', () => {
  it('formats a single entry with type', () => {
    expect(formatArmorClass([{ type: 'natural', value: 19 }])).toBe(
      '19 (natural)',
    );
  });

  it('omits the parenthetical if no type or condition', () => {
    expect(formatArmorClass([{ type: '', value: 12 }])).toBe('12');
  });

  it('joins multiple entries with a comma', () => {
    expect(
      formatArmorClass([
        { type: 'natural', value: 17 },
        { type: 'with shield', value: 19, condition: 'wielding shield' },
      ]),
    ).toBe('17 (natural), 19 (with shield, wielding shield)');
  });
});

describe('formatSpeed', () => {
  it('renders walk without prefix and other modes with a prefix', () => {
    expect(
      formatSpeed({ walk: '40 ft.', fly: '80 ft.', climb: '40 ft.' }),
    ).toBe('40 ft., climb 40 ft., fly 80 ft.');
  });

  it('appends (hover) when hover is true', () => {
    expect(formatSpeed({ walk: '0 ft.', fly: '50 ft.', hover: true })).toBe(
      '0 ft., fly 50 ft. (hover)',
    );
  });

  it('falls back to "0 ft." when no modes are set', () => {
    expect(formatSpeed({})).toBe('0 ft.');
  });
});

describe('formatSenses', () => {
  it('lists distance senses then passive perception, comma-separated', () => {
    expect(
      formatSenses({
        blindsight: '60 ft.',
        darkvision: '120 ft.',
        passivePerception: 23,
      }),
    ).toBe('Blindsight 60 ft., Darkvision 120 ft., Passive Perception 23');
  });

  it('always includes passive perception even with no other senses', () => {
    expect(formatSenses({ passivePerception: 10 })).toBe(
      'Passive Perception 10',
    );
  });
});

describe('formatReferenceList', () => {
  it('joins reference names with commas', () => {
    expect(
      formatReferenceList([
        { index: 'charmed', name: 'Charmed' },
        { index: 'frightened', name: 'Frightened' },
      ]),
    ).toBe('Charmed, Frightened');
  });
});

describe('partitionProficiencies', () => {
  it('routes saves and skills by index prefix and ignores others', () => {
    const profs = [
      {
        value: 6,
        proficiency: { index: 'saving-throw-dex', name: 'Saving Throw: DEX' },
      },
      {
        value: 13,
        proficiency: { index: 'skill-perception', name: 'Skill: Perception' },
      },
      {
        value: 0,
        proficiency: { index: 'weapon-longsword', name: 'Weapon: Longsword' },
      },
    ];
    const { saves, skills } = partitionProficiencies(profs);
    expect(saves).toHaveLength(1);
    expect(skills).toHaveLength(1);
    expect(saves[0]?.proficiency.index).toBe('saving-throw-dex');
    expect(skills[0]?.proficiency.index).toBe('skill-perception');
  });
});

describe('formatProficiency / formatProficiencyList', () => {
  it('strips the prefix and signs the value', () => {
    expect(
      formatProficiency({
        value: 6,
        proficiency: { index: 'saving-throw-dex', name: 'Saving Throw: DEX' },
      }),
    ).toBe('DEX +6');
  });

  it('joins a list with commas', () => {
    expect(
      formatProficiencyList([
        {
          value: 6,
          proficiency: { index: 'saving-throw-dex', name: 'Saving Throw: DEX' },
        },
        {
          value: 13,
          proficiency: {
            index: 'saving-throw-con',
            name: 'Saving Throw: CON',
          },
        },
      ]),
    ).toBe('DEX +6, CON +13');
  });
});
