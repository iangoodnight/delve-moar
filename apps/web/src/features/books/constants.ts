export type SortDirection = 'asc' | 'desc';

export interface BookSortOption {
  readonly label: string;
  // A sort column the in-book list endpoints accept; direction is separate.
  readonly value: string;
}

export const MONSTER_SORT_OPTIONS: readonly BookSortOption[] = [
  { label: 'Name', value: 'name' },
  { label: 'Challenge rating', value: 'challenge_rating' },
  { label: 'Type', value: 'monster_type' },
];

export const SPELL_SORT_OPTIONS: readonly BookSortOption[] = [
  { label: 'Name', value: 'name' },
  { label: 'Level', value: 'level' },
  { label: 'School', value: 'school' },
];

export const ITEM_SORT_OPTIONS: readonly BookSortOption[] = [
  { label: 'Name', value: 'name' },
  { label: 'Category', value: 'item_category' },
  { label: 'Rarity', value: 'rarity' },
];

export const DEFAULT_SORT_COLUMN = 'name';
export const DEFAULT_SORT_DIRECTION: SortDirection = 'asc';
