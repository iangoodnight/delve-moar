import type { Meta, StoryObj } from '@storybook/react-vite';

import { Box } from '@/components/ui/layout';

import { MONSTER_SORT_OPTIONS } from '../constants';

import { BookContentSection } from './book-content-section';

function noop() {
  /* no-op */
}

const ROWS = [
  { key: 'goblin', name: 'Goblin', href: '/monsters/goblin', meta: 'CR 1/4' },
  { key: 'orc', name: 'Orc', href: '/monsters/orc', meta: 'CR 1/2' },
  {
    key: 'adult-red-dragon',
    name: 'Adult Red Dragon',
    href: '/monsters/adult-red-dragon',
    meta: 'CR 17',
  },
];

const baseArgs = {
  title: 'Monsters',
  emptyLabel: 'No monsters in this book yet.',
  search: {
    value: '',
    placeholder: 'Search monsters...',
    hasActiveQuery: false,
    onChange: noop,
  },
  sort: {
    column: 'name',
    direction: 'asc' as const,
    options: MONSTER_SORT_OPTIONS,
    onColumnChange: noop,
    onDirectionToggle: noop,
  },
  list: {
    rows: ROWS,
    isLoading: false,
    isError: false,
    errorMessage: undefined,
    hasNextPage: false,
    isFetchingNextPage: false,
    onLoadMore: noop,
  },
};

const meta: Meta<typeof BookContentSection> = {
  title: 'Features/Books/BookContentSection',
  component: BookContentSection,
  parameters: {
    docs: {
      description: {
        component:
          'One content type inside a book: a search box, a sort column ' +
          'select plus a direction toggle, and the list of rows. The parent ' +
          'owns the filter state; this component is presentational.',
      },
    },
  },
  args: baseArgs,
  decorators: [
    (Story) => (
      <Box style={{ maxWidth: 640, width: '100%' }}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof BookContentSection>;

export const Default: Story = {};

export const Empty: Story = {
  args: { list: { ...baseArgs.list, rows: [] } },
};

export const NoResults: Story = {
  args: {
    search: { ...baseArgs.search, value: 'zzz', hasActiveQuery: true },
    list: { ...baseArgs.list, rows: [] },
  },
};

export const ErrorState: Story = {
  args: {
    list: { ...baseArgs.list, rows: [], isError: true, errorMessage: 'Boom.' },
  },
};

export const Loading: Story = {
  args: { list: { ...baseArgs.list, rows: [], isLoading: true } },
};
