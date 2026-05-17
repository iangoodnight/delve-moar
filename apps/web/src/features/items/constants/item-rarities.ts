// Rarity values mirror what the seeder stores: lowercase strings matching
// the SRD `rarity.name` field. Badge colors use the Radix accent palette.
export type ItemRarityValue =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'very rare'
  | 'legendary'
  | 'artifact'
  | 'varies';

export interface ItemRarityOption {
  value: ItemRarityValue;
  label: string;
  badgeColor: 'gray' | 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'amber';
}

export const ITEM_RARITIES: ItemRarityOption[] = [
  { value: 'common', label: 'Common', badgeColor: 'gray' },
  { value: 'uncommon', label: 'Uncommon', badgeColor: 'green' },
  { value: 'rare', label: 'Rare', badgeColor: 'blue' },
  { value: 'very rare', label: 'Very Rare', badgeColor: 'purple' },
  { value: 'legendary', label: 'Legendary', badgeColor: 'orange' },
  { value: 'artifact', label: 'Artifact', badgeColor: 'red' },
  { value: 'varies', label: 'Varies', badgeColor: 'amber' },
];

export function getRarityOption(
  rarity: string | null | undefined,
): ItemRarityOption | undefined {
  if (!rarity) return undefined;
  return ITEM_RARITIES.find((r) => r.value === rarity.toLowerCase());
}
