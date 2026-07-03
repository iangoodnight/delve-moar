// Test fixture: Adult Red Dragon, shaped like the SRD API response
// (camelCase). Trimmed where convenient but covers every stat-block
// section the renderer touches.
import type { Monster } from '@/features/monsters/api';

export const adultRedDragonMonster: Monster = {
  id: '7c2ed6d9-fad8-45d1-b39c-840992fb36c3',
  slug: 'adult-red-dragon',
  name: 'Adult Red Dragon',
  monsterType: 'dragon',
  challengeRating: '17',
  content: {
    name: 'Adult Red Dragon',
    size: 'Huge',
    type: 'dragon',
    alignment: 'chaotic evil',
    armorClass: [{ type: 'natural', value: 19 }],
    hitPoints: 256,
    hitDice: '19d12',
    hitPointsRoll: '19d12+133',
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
    damageImmunities: ['fire'],
    damageResistances: [],
    damageVulnerabilities: [],
    conditionImmunities: [],
    senses: {
      blindsight: '60 ft.',
      darkvision: '120 ft.',
      passivePerception: 23,
    },
    languages: 'Common, Draconic',
    challengeRating: 17,
    xp: 18000,
    proficiencyBonus: 6,
    actions: [
      { name: 'Bite', desc: 'Melee Weapon Attack: +14 to hit.' },
      { name: 'Claw', desc: 'Melee Weapon Attack: +14 to hit.' },
    ],
    specialAbilities: [
      {
        name: 'Legendary Resistance',
        desc: 'If the dragon fails a saving throw, it can choose to succeed instead.',
      },
    ],
    legendaryActions: [
      { name: 'Detect', desc: 'The dragon makes a Wisdom check.' },
    ],
  },
  contentSource: {
    type: 'srd',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Wizards of the Coast LLC',
    dataProvider: '5e-bits/5e-database',
    dataProviderUrl: 'https://github.com/5e-bits/5e-database',
  },
};
