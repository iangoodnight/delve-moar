// Test fixture: Fireball (3rd-level evocation), shaped like the SRD API
// response (camelCase). Covers all required detail fields: components
// with material, concentration false, higherLevel, and two caster classes.
import type { Spell } from '@/features/spells/api';

export const fireballSpell: Spell = {
  id: '979283ce-bda8-43f4-983e-91c588a987c9',
  slug: 'fireball',
  name: 'Fireball',
  level: '3rd',
  school: 'evocation',
  content: {
    name: 'Fireball',
    level: 3,
    school: { index: 'evocation', name: 'Evocation' },
    castingTime: '1 action',
    range: '150 feet',
    components: ['V', 'S', 'M'],
    material: 'A tiny ball of bat guano and sulfur',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    desc: [
      'A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame.',
      "The fire spreads around corners. It ignites flammable objects in the area that aren't being worn or carried.",
    ],
    higherLevel: [
      'When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.',
    ],
    classes: [
      { index: 'sorcerer', name: 'Sorcerer' },
      { index: 'wizard', name: 'Wizard' },
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
