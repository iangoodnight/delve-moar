import { Theme } from '@radix-ui/themes';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { ItemFilters } from '../item-filters';

function SearchParamsProbe() {
  const [params] = useSearchParams();
  return <div data-testid="search-params">{params.toString()}</div>;
}

function renderFilters(initialEntry = '/items') {
  return render(
    <Theme>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ItemFilters />
        <SearchParamsProbe />
      </MemoryRouter>
    </Theme>,
  );
}

function searchParamsNode() {
  return screen.getByTestId('search-params');
}

describe('ItemFilters', () => {
  it('renders search, category, and rarity controls', () => {
    renderFilters();
    expect(screen.getByPlaceholderText(/search items/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rarity/i)).toBeInTheDocument();
  });

  it('debounces search input updates to the URL', async () => {
    const user = userEvent.setup();
    renderFilters();

    await user.type(screen.getByPlaceholderText(/search items/i), 'sword');

    await waitFor(() => {
      expect(searchParamsNode()).toHaveTextContent('search=sword');
    });
  });

  it('initializes the search input from the URL on mount', () => {
    renderFilters('/items?search=potion');
    expect(screen.getByPlaceholderText(/search items/i)).toHaveValue('potion');
  });

  it('clears the input and search param on Escape', async () => {
    const user = userEvent.setup();
    renderFilters('/items?search=potion');

    const input = screen.getByPlaceholderText(/search items/i);
    expect(input).toHaveValue('potion');

    await user.click(input);
    await user.keyboard('{Escape}');

    expect(input).toHaveValue('');
    await waitFor(() => {
      expect(searchParamsNode()).not.toHaveTextContent('search=');
    });
  });

  it('reflects an existing item_category URL param on the category trigger', () => {
    renderFilters('/items?item_category=weapon');
    expect(screen.getByLabelText(/category/i)).toHaveTextContent('Weapon');
  });

  it('enables the rarity select when no category is selected', () => {
    renderFilters();
    expect(screen.getByLabelText(/rarity/i)).not.toBeDisabled();
  });

  it('disables the rarity select for mundane-only categories', () => {
    renderFilters('/items?item_category=adventuring-gear');
    expect(screen.getByLabelText(/rarity/i)).toBeDisabled();
  });

  it('keeps the rarity select enabled for rarity-capable categories', () => {
    renderFilters('/items?item_category=wondrous-items');
    expect(screen.getByLabelText(/rarity/i)).not.toBeDisabled();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderFilters();
    expect(await axe(container)).toHaveNoViolations();
  });
});
