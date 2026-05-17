// Test fixture: Amulet of Health, shaped like the SRD seed payload. A
// magic item with rarity and attunement; covers the magic-side detail
// fields (rarity badge, requires_attunement, description paragraphs).
import type { Item } from '@/features/items/api';

export const amuletOfHealthItem: Item = {
  slug: 'amulet-of-health',
  name: 'Amulet of Health',
  itemCategory: 'wondrous-items',
  rarity: 'rare',
  content: {
    name: 'Amulet of Health',
    desc: [
      'Your Constitution score is 19 while you wear this amulet. It has no effect on you if your Constitution score is already 19 or higher without it.',
    ],
    requires_attunement: 'requires attunement',
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
