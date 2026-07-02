import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { MONSTER_SORT_OPTIONS } from '../../constants';
import { BookContentSection } from '../book-content-section';

type Props = ComponentProps<typeof BookContentSection>;

const ROWS = [
  { key: 'goblin', name: 'Goblin', href: '/monsters/goblin', meta: 'CR 1/4' },
];

function makeProps() {
  const onSearchChange = vi.fn();
  const onColumnChange = vi.fn();
  const onDirectionToggle = vi.fn();
  const onLoadMore = vi.fn();
  const props: Props = {
    title: 'Monsters',
    emptyLabel: 'No monsters in this book yet.',
    search: {
      value: '',
      placeholder: 'Search monsters...',
      hasActiveQuery: false,
      onChange: onSearchChange,
    },
    sort: {
      column: 'name',
      direction: 'asc',
      options: MONSTER_SORT_OPTIONS,
      onColumnChange,
      onDirectionToggle,
    },
    list: {
      rows: ROWS,
      isLoading: false,
      isError: false,
      errorMessage: undefined,
      hasNextPage: false,
      isFetchingNextPage: false,
      onLoadMore,
    },
  };
  return { props, onSearchChange, onColumnChange, onDirectionToggle };
}

function renderSection(props: Props) {
  return render(
    <Theme>
      <MemoryRouter>
        <BookContentSection {...props} />
      </MemoryRouter>
    </Theme>,
  );
}

describe('BookContentSection', () => {
  it('renders the content rows', () => {
    const { props } = makeProps();
    renderSection(props);
    expect(screen.getByRole('link', { name: 'Goblin' })).toBeInTheDocument();
  });

  it('reports search input changes', async () => {
    const user = userEvent.setup();
    const { props, onSearchChange } = makeProps();
    renderSection(props);

    await user.type(screen.getByPlaceholderText('Search monsters...'), 'g');
    expect(onSearchChange).toHaveBeenCalledWith('g');
  });

  it('clears the search on Escape', async () => {
    const user = userEvent.setup();
    const { props, onSearchChange } = makeProps();
    renderSection({ ...props, search: { ...props.search, value: 'goblin' } });

    await user.click(screen.getByPlaceholderText('Search monsters...'));
    await user.keyboard('{Escape}');
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('toggles the sort direction', async () => {
    const user = userEvent.setup();
    const { props, onDirectionToggle } = makeProps();
    renderSection(props);

    await user.click(screen.getByRole('button', { name: /sort direction/i }));
    expect(onDirectionToggle).toHaveBeenCalledTimes(1);
  });

  it('reflects the descending direction in the control label', () => {
    const { props } = makeProps();
    renderSection({ ...props, sort: { ...props.sort, direction: 'desc' } });
    expect(
      screen.getByRole('button', { name: /descending/i }),
    ).toBeInTheDocument();
  });

  it('shows the empty label when the book has none of this type', () => {
    const { props } = makeProps();
    renderSection({ ...props, list: { ...props.list, rows: [] } });
    expect(
      screen.getByText('No monsters in this book yet.'),
    ).toBeInTheDocument();
  });

  it('shows a no-results message when a search matches nothing', () => {
    const { props } = makeProps();
    renderSection({
      ...props,
      search: { ...props.search, hasActiveQuery: true },
      list: { ...props.list, rows: [] },
    });
    expect(
      screen.getByText(/no monsters match your search/i),
    ).toBeInTheDocument();
  });

  it('surfaces an error state', () => {
    const { props } = makeProps();
    renderSection({
      ...props,
      list: {
        ...props.list,
        rows: [],
        isError: true,
        errorMessage: 'Boom.',
      },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      /could not load monsters/i,
    );
  });

  it('has no accessibility violations', async () => {
    const { props } = makeProps();
    const { container } = renderSection(props);
    expect(await axe(container)).toHaveNoViolations();
  });
});
