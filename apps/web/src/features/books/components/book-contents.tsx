import { useState } from 'react';

import { Box } from '@/components/ui/layout';
import { Tabs } from '@/components/ui/tabs';

import type { Book } from '../api/get-book';
import type { SortDirection } from '../constants';
import { DEFAULT_SORT_COLUMN, DEFAULT_SORT_DIRECTION } from '../constants';
import { useHashTab } from '../hooks';

import {
  BookItemsSection,
  BookMonstersSection,
  BookSpellsSection,
} from './book-content-sections';

const TABS = ['monsters', 'spells', 'items'] as const;
type ContentTab = (typeof TABS)[number];

interface ContentFilter {
  readonly search: string;
  readonly sortColumn: string;
  readonly sortDirection: SortDirection;
}

type FilterState = Record<ContentTab, ContentFilter>;

const INITIAL_FILTER: ContentFilter = {
  search: '',
  sortColumn: DEFAULT_SORT_COLUMN,
  sortDirection: DEFAULT_SORT_DIRECTION,
};

const INITIAL_FILTERS: FilterState = {
  monsters: INITIAL_FILTER,
  spells: INITIAL_FILTER,
  items: INITIAL_FILTER,
};

interface BookContentsProps {
  readonly book: Book;
}

export function BookContents({ book }: Readonly<BookContentsProps>) {
  const [tab, setTab] = useHashTab(TABS, 'monsters');
  // Hoisted so search/sort survive the tab unmount/remount on switch.
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  const patch = (type: ContentTab, next: Partial<ContentFilter>) => {
    setFilters((prev) => ({ ...prev, [type]: { ...prev[type], ...next } }));
  };

  const toggleDirection = (type: ContentTab) => {
    setFilters((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        sortDirection: prev[type].sortDirection === 'asc' ? 'desc' : 'asc',
      },
    }));
  };

  return (
    <Tabs.Root onValueChange={setTab} value={tab}>
      <Tabs.List>
        <Tabs.Trigger value="monsters">
          Monsters ({book.monsterCount})
        </Tabs.Trigger>
        <Tabs.Trigger value="spells">Spells ({book.spellCount})</Tabs.Trigger>
        <Tabs.Trigger value="items">Items ({book.itemCount})</Tabs.Trigger>
      </Tabs.List>
      <Box pt="4">
        <Tabs.Content value="monsters">
          <BookMonstersSection
            bookId={book.id}
            onDirectionToggle={() => {
              toggleDirection('monsters');
            }}
            onSearchChange={(value) => {
              patch('monsters', { search: value });
            }}
            onSortColumnChange={(value) => {
              patch('monsters', { sortColumn: value });
            }}
            search={filters.monsters.search}
            sortColumn={filters.monsters.sortColumn}
            sortDirection={filters.monsters.sortDirection}
          />
        </Tabs.Content>
        <Tabs.Content value="spells">
          <BookSpellsSection
            bookId={book.id}
            onDirectionToggle={() => {
              toggleDirection('spells');
            }}
            onSearchChange={(value) => {
              patch('spells', { search: value });
            }}
            onSortColumnChange={(value) => {
              patch('spells', { sortColumn: value });
            }}
            search={filters.spells.search}
            sortColumn={filters.spells.sortColumn}
            sortDirection={filters.spells.sortDirection}
          />
        </Tabs.Content>
        <Tabs.Content value="items">
          <BookItemsSection
            bookId={book.id}
            onDirectionToggle={() => {
              toggleDirection('items');
            }}
            onSearchChange={(value) => {
              patch('items', { search: value });
            }}
            onSortColumnChange={(value) => {
              patch('items', { sortColumn: value });
            }}
            search={filters.items.search}
            sortColumn={filters.items.sortColumn}
            sortDirection={filters.items.sortDirection}
          />
        </Tabs.Content>
      </Box>
    </Tabs.Root>
  );
}
