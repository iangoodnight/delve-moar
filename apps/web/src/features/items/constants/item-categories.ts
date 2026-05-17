// Categories come from the SRD `equipment_category.index` field, stored
// verbatim by the seeder. Display labels are humanized for the dropdown.
//
// `rarityCapable` flags categories that can carry a non-null `rarity` in
// the seed data. Mundane-only categories (adventuring-gear, tools, ...)
// always have `rarity = null`, so filtering them by rarity yields an empty
// resultset; the filter UI disables the rarity dropdown when one is picked
// and clears any active rarity filter.
//
// Magic weapons and magic armor live under `weapon`/`armor` with a non-null
// rarity, so those categories stay rarity-capable.
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
