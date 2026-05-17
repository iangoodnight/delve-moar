import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import type { ItemSummary } from '@/features/items/api';

import { ItemCard } from '../item-card';

const LONGSWORD: ItemSummary = {
  slug: 'longsword',
  name: 'Longsword',
  itemCategory: 'weapon',
  rarity: null,
};

const AMULET: ItemSummary = {
  slug: 'amulet-of-health',
  name: 'Amulet of Health',
  itemCategory: 'wondrous-items',
  rarity: 'rare',
};

const UNCATEGORIZED: ItemSummary = {
  slug: 'mystery',
  name: 'Mystery',
  itemCategory: null,
  rarity: null,
};

function renderCard(item: ItemSummary) {
  return render(
    <Theme>
      <MemoryRouter>
        <ItemCard item={item} />
      </MemoryRouter>
    </Theme>,
  );
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
});
