export interface ItemCategoryOption {
  value: string;
  label: string;
  rarityCapable: boolean;
}

export const ITEM_CATEGORIES: ItemCategoryOption[] = [
  { value: 'weapon', label: 'Weapon', rarityCapable: true },
  { value: 'armor', label: 'Armor', rarityCapable: true },
  {
    value: 'adventuring-gear',
    label: 'Adventuring Gear',
    rarityCapable: false,
  },
  { value: 'ammunition', label: 'Ammunition', rarityCapable: false },
  { value: 'equipment-packs', label: 'Equipment Packs', rarityCapable: false },
  { value: 'tools', label: 'Tools', rarityCapable: false },
  {
    value: 'mounts-and-vehicles',
    label: 'Mounts & Vehicles',
    rarityCapable: false,
  },
  { value: 'trade-goods', label: 'Trade Goods', rarityCapable: false },
  { value: 'wondrous-items', label: 'Wondrous Items', rarityCapable: true },
  { value: 'potion', label: 'Potions', rarityCapable: true },
  { value: 'ring', label: 'Rings', rarityCapable: true },
  { value: 'rod', label: 'Rods', rarityCapable: true },
  { value: 'scroll', label: 'Scrolls', rarityCapable: true },
  { value: 'staff', label: 'Staves', rarityCapable: true },
  { value: 'wand', label: 'Wands', rarityCapable: true },
];

export function isRarityCapable(category: string | undefined): boolean {
  if (!category) return true;
  return (
    ITEM_CATEGORIES.find((c) => c.value === category)?.rarityCapable ?? false
  );
}

export function getItemCategoryLabel(
  category: string | null | undefined,
): string {
  if (!category) return 'Uncategorized';
  return ITEM_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}
