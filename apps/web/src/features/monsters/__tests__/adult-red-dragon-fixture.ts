// Test fixture: Adult Red Dragon, shaped like the SRD seed payload. Trimmed
// where convenient but covers every stat-block section the renderer touches.
import type { Monster } from '@/features/monsters/api';

export const adultRedDragonMonster: Monster = {
  slug: 'adult-red-dragon',
  name: 'Adult Red Dragon',
  monsterType: 'dragon',
  challengeRating: '17',
  content: {
    name: 'Adult Red Dragon',
    size: 'Huge',
    type: 'dragon',
    alignment: 'chaotic evil',
    armor_class: [{ type: 'natural', value: 19 }],
    hit_points: 256,
    hit_dice: '19d12',
    hit_points_roll: '19d12+133',
    speed: { walk: '40 ft.', fly: '80 ft.', climb: '40 ft.' },
    strength: 27,
    dexterity: 10,
    constitution: 25,
    intelligence: 16,
    wisdom: 13,
    charisma: 21,
    proficiencies: [
      {
        value: 6,
        proficiency: {
          index: 'saving-throw-dex',
          name: 'Saving Throw: DEX',
        },
      },
      {
        value: 13,
        proficiency: {
          index: 'saving-throw-con',
          name: 'Saving Throw: CON',
        },
      },
      {
        value: 13,
        proficiency: {
          index: 'skill-perception',
          name: 'Skill: Perception',
        },
      },
      {
        value: 6,
        proficiency: {
          index: 'skill-stealth',
          name: 'Skill: Stealth',
        },
      },
    ],
    damage_immunities: ['fire'],
    damage_resistances: [],
    damage_vulnerabilities: [],
    condition_immunities: [],
    senses: {
      blindsight: '60 ft.',
      darkvision: '120 ft.',
      passive_perception: 23,
    },
    languages: 'Common, Draconic',
    challenge_rating: 17,
    xp: 18000,
    proficiency_bonus: 6,
    actions: [
      { name: 'Bite', desc: 'Melee Weapon Attack: +14 to hit.' },
      { name: 'Claw', desc: 'Melee Weapon Attack: +14 to hit.' },
    ],
    special_abilities: [
      {
        name: 'Legendary Resistance',
        desc: 'If the dragon fails a saving throw, it can choose to succeed instead.',
      },
    ],
    legendary_actions: [
      { name: 'Detect', desc: 'The dragon makes a Wisdom check.' },
    ],
  },
  contentSource: {
    type: 'srd',
    license: 'CC BY 4.0',
    license_url: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Wizards of the Coast LLC',
    data_provider: '5e-bits/5e-database',
    data_provider_url: 'https://github.com/5e-bits/5e-database',
  },
};
