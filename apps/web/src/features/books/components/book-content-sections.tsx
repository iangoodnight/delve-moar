import { useInfiniteQuery } from '@tanstack/react-query';

import { paths } from '@/config/paths';

import {
  getBookItemsInfiniteQueryOptions,
  getBookMonstersInfiniteQueryOptions,
  getBookSpellsInfiniteQueryOptions,
} from '../api/get-book-contents';
import type { SortDirection } from '../constants';
import {
  ITEM_SORT_OPTIONS,
  MONSTER_SORT_OPTIONS,
  SPELL_SORT_OPTIONS,
} from '../constants';
import { useDebouncedValue } from '../hooks';

import type { BookContentRowData } from './book-content-row';
import { BookContentSection } from './book-content-section';

const SEARCH_DEBOUNCE_MS = 300;

// Filter state is owned by BookContents and passed in, so it survives the tab
// unmount/remount that Radix does on switch.
interface SectionProps {
  readonly bookId: string;
  readonly search: string;
  readonly sortColumn: string;
  readonly sortDirection: SortDirection;
  readonly onSearchChange: (value: string) => void;
  readonly onSortColumnChange: (value: string) => void;
  readonly onDirectionToggle: () => void;
}

export function BookMonstersSection({
  bookId,
  search,
  sortColumn,
  sortDirection,
  onSearchChange,
  onSortColumnChange,
  onDirectionToggle,
}: Readonly<SectionProps>) {
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const query = useInfiniteQuery(
    getBookMonstersInfiniteQueryOptions(bookId, {
      search: debouncedSearch || undefined,
      orderBy: `${sortColumn}:${sortDirection}`,
    }),
  );
  const rows: BookContentRowData[] = (
    query.data?.pages.flatMap((page) => page.data) ?? []
  ).map((monster) => ({
    key: monster.slug,
    name: monster.name,
    href: paths.monsterDetail.getHref(monster.slug),
    meta: `CR ${monster.challengeRating}`,
  }));

  return (
    <BookContentSection
      emptyLabel="No monsters in this book yet."
      list={{
        rows,
        isLoading: query.isLoading,
        isError: query.isError,
        errorMessage: query.error?.message,
        hasNextPage: query.hasNextPage,
        isFetchingNextPage: query.isFetchingNextPage,
        onLoadMore: () => void query.fetchNextPage(),
      }}
      search={{
        value: search,
        placeholder: 'Search monsters...',
        hasActiveQuery: debouncedSearch.trim() !== '',
        onChange: onSearchChange,
      }}
      sort={{
        column: sortColumn,
        direction: sortDirection,
        options: MONSTER_SORT_OPTIONS,
        onColumnChange: onSortColumnChange,
        onDirectionToggle,
      }}
      title="Monsters"
    />
  );
}

export function BookSpellsSection({
  bookId,
  search,
  sortColumn,
  sortDirection,
  onSearchChange,
  onSortColumnChange,
  onDirectionToggle,
}: Readonly<SectionProps>) {
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const query = useInfiniteQuery(
    getBookSpellsInfiniteQueryOptions(bookId, {
      search: debouncedSearch || undefined,
      orderBy: `${sortColumn}:${sortDirection}`,
    }),
  );
  const rows: BookContentRowData[] = (
    query.data?.pages.flatMap((page) => page.data) ?? []
  ).map((spell) => ({
    key: spell.slug,
    name: spell.name,
    href: paths.spellDetail.getHref(spell.slug),
    meta: spell.level === '0' ? 'Cantrip' : `Level ${spell.level}`,
  }));

  return (
    <BookContentSection
      emptyLabel="No spells in this book yet."
      list={{
        rows,
        isLoading: query.isLoading,
        isError: query.isError,
        errorMessage: query.error?.message,
        hasNextPage: query.hasNextPage,
        isFetchingNextPage: query.isFetchingNextPage,
        onLoadMore: () => void query.fetchNextPage(),
      }}
      search={{
        value: search,
        placeholder: 'Search spells...',
        hasActiveQuery: debouncedSearch.trim() !== '',
        onChange: onSearchChange,
      }}
      sort={{
        column: sortColumn,
        direction: sortDirection,
        options: SPELL_SORT_OPTIONS,
        onColumnChange: onSortColumnChange,
        onDirectionToggle,
      }}
      title="Spells"
    />
  );
}

export function BookItemsSection({
  bookId,
  search,
  sortColumn,
  sortDirection,
  onSearchChange,
  onSortColumnChange,
  onDirectionToggle,
}: Readonly<SectionProps>) {
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const query = useInfiniteQuery(
    getBookItemsInfiniteQueryOptions(bookId, {
      search: debouncedSearch || undefined,
      orderBy: `${sortColumn}:${sortDirection}`,
    }),
  );
  const rows: BookContentRowData[] = (
    query.data?.pages.flatMap((page) => page.data) ?? []
  ).map((item) => ({
    key: item.slug,
    name: item.name,
    href: paths.itemDetail.getHref(item.slug),
    meta: item.rarity ?? item.itemCategory ?? 'Item',
  }));

  return (
    <BookContentSection
      emptyLabel="No items in this book yet."
      list={{
        rows,
        isLoading: query.isLoading,
        isError: query.isError,
        errorMessage: query.error?.message,
        hasNextPage: query.hasNextPage,
        isFetchingNextPage: query.isFetchingNextPage,
        onLoadMore: () => void query.fetchNextPage(),
      }}
      search={{
        value: search,
        placeholder: 'Search items...',
        hasActiveQuery: debouncedSearch.trim() !== '',
        onChange: onSearchChange,
      }}
      sort={{
        column: sortColumn,
        direction: sortDirection,
        options: ITEM_SORT_OPTIONS,
        onColumnChange: onSortColumnChange,
        onDirectionToggle,
      }}
      title="Items"
    />
  );
}
