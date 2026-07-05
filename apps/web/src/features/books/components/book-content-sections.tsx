import { capitalize } from '@goodnight-dev/string';
import { useInfiniteQuery } from '@tanstack/react-query';

import { paths } from '@/config/paths';
import { getItemCategoryLabel } from '@/constants/item-categories';
import { getRarityOption } from '@/constants/item-rarities';
import { formatSpellLevel } from '@/utils/format';

import { useRemoveContentFromBook } from '../api/content-membership';
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
  const removeMutation = useRemoveContentFromBook();
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
    id: monster.id,
    name: monster.name,
    href: `${paths.monsterDetail.getHref(monster.slug)}?fromBook=${bookId}`,
    badges: [
      { label: capitalize(monster.monsterType ?? 'Unknown') },
      { label: `CR ${monster.challengeRating}` },
    ],
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
      onRemoveRow={(contentId) => {
        removeMutation.mutate({ bookId, contentType: 'monster', contentId });
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
  const removeMutation = useRemoveContentFromBook();
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
    id: spell.id,
    name: spell.name,
    href: `${paths.spellDetail.getHref(spell.slug)}?fromBook=${bookId}`,
    badges: [
      { label: capitalize(spell.school ?? 'Unknown') },
      { label: formatSpellLevel(spell.level) },
    ],
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
      onRemoveRow={(contentId) => {
        removeMutation.mutate({ bookId, contentType: 'spell', contentId });
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
  const removeMutation = useRemoveContentFromBook();
  const query = useInfiniteQuery(
    getBookItemsInfiniteQueryOptions(bookId, {
      search: debouncedSearch || undefined,
      orderBy: `${sortColumn}:${sortDirection}`,
    }),
  );
  const rows: BookContentRowData[] = (
    query.data?.pages.flatMap((page) => page.data) ?? []
  ).map((item) => {
    const rarity = getRarityOption(item.rarity);
    return {
      key: item.slug,
      id: item.id,
      name: item.name,
      href: `${paths.itemDetail.getHref(item.slug)}?fromBook=${bookId}`,
      badges: [
        { label: getItemCategoryLabel(item.itemCategory) },
        ...(rarity ? [{ label: rarity.label, color: rarity.badgeColor }] : []),
      ],
    };
  });

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
      onRemoveRow={(contentId) => {
        removeMutation.mutate({ bookId, contentType: 'item', contentId });
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
