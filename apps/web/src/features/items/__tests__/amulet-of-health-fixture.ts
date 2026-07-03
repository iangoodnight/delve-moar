// Test fixture: Amulet of Health, shaped like the SRD API response
// (camelCase). A magic item with rarity and attunement; covers the
// magic-side detail fields (rarity badge, requiresAttunement, description
// paragraphs).
import type { Item } from '@/features/items/api';

export const amuletOfHealthItem: Item = {
  id: 'eaf538fa-c6b9-4c2e-a5e3-7dd4f69e6092',
  slug: 'amulet-of-health',
  name: 'Amulet of Health',
  itemCategory: 'wondrous-items',
  rarity: 'rare',
  content: {
    name: 'Amulet of Health',
    desc: [
      'Your Constitution score is 19 while you wear this amulet. It has no effect on you if your Constitution score is already 19 or higher without it.',
    ],
    requiresAttunement: 'requires attunement',
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
