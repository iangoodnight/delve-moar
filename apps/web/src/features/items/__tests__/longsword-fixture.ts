// Test fixture: Longsword, shaped like the SRD seed payload. A mundane
// weapon — no rarity — that exercises the equipment-side detail fields:
// cost, weight, weapon category and range, damage, two-handed damage, and
// properties.
import type { Item } from '@/features/items/api';

export const longswordItem: Item = {
  slug: 'longsword',
  name: 'Longsword',
  itemCategory: 'weapon',
  rarity: null,
  content: {
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
