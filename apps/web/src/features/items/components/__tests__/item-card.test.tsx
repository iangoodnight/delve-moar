import { Theme } from '@radix-ui/themes';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import type { ItemSummary } from '@/features/items/api';
import { createTestQueryClient } from '@/testing/setup';

import { ItemCard } from '../item-card';

const LONGSWORD: ItemSummary = {
  id: 'ea0afe28-bc4e-4cb5-970f-7cf7802590e9',
  slug: 'longsword',
  name: 'Longsword',
  itemCategory: 'weapon',
  rarity: null,
};

const AMULET: ItemSummary = {
  id: '7c92eae3-6301-4775-b689-945bbbd65f41',
  slug: 'amulet-of-health',
  name: 'Amulet of Health',
  itemCategory: 'wondrous-items',
  rarity: 'rare',
};

const UNCATEGORIZED: ItemSummary = {
  id: '3263ac39-797f-4d11-9346-553e750ed022',
  slug: 'mystery',
  name: 'Mystery',
  itemCategory: null,
  rarity: null,
};

function renderCard(item: ItemSummary) {
  const queryClient = createTestQueryClient();
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <MemoryRouter>
            <ItemCard item={item} />
          </MemoryRouter>
        </Theme>
      </QueryClientProvider>,
    ),
  };
}

describe('ItemCard', () => {
  it('renders the item name', () => {
    renderCard(LONGSWORD);
    expect(screen.getByText('Longsword')).toBeInTheDocument();
  });

  it('renders the humanized category', () => {
    renderCard(LONGSWORD);
    expect(screen.getByText('Weapon')).toBeInTheDocument();
  });

  it('does not render a rarity badge for mundane items', () => {
    renderCard(LONGSWORD);
    expect(screen.queryByText(/common|uncommon|rare/i)).not.toBeInTheDocument();
  });

  it('renders the rarity badge when the item has a rarity', () => {
    renderCard(AMULET);
    expect(screen.getByText('Rare')).toBeInTheDocument();
  });

  it('falls back to "Uncategorized" when category is null', () => {
    renderCard(UNCATEGORIZED);
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
  });

  it('links to the item detail page using the slug', () => {
    renderCard(LONGSWORD);
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/items/longsword',
    );
  });

  it('exposes the slug via data-item for keyboard navigation hand-off', () => {
    renderCard(LONGSWORD);
    expect(screen.getByRole('link')).toHaveAttribute('data-item', 'longsword');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderCard(AMULET);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('warms the item detail cache on pointer enter', async () => {
    const { queryClient } = renderCard(LONGSWORD);
    const prefetchSpy = vi
      .spyOn(queryClient, 'prefetchQuery')
      .mockResolvedValue(undefined);

    fireEvent.mouseEnter(screen.getByRole('link'));

    await waitFor(() => {
      expect(prefetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['items', 'detail', 'longsword'] }),
      );
    });
  });
});
