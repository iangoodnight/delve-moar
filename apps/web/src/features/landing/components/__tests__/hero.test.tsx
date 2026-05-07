import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { paths } from '@/config/paths';

import { Hero } from '../hero';

function renderHero() {
  return render(
    <Theme>
      <MemoryRouter>
        <Hero />
      </MemoryRouter>
    </Theme>,
  );
}

describe('Hero', () => {
  it('renders a top-level page heading', () => {
    renderHero();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders catalog links to monsters, items, and spells', () => {
    renderHero();

    expect(
      screen.getByRole('link', { name: paths.monsters.displayName }),
    ).toHaveAttribute('href', paths.monsters.path);
    expect(
      screen.getByRole('link', { name: paths.items.displayName }),
    ).toHaveAttribute('href', paths.items.path);
    expect(
      screen.getByRole('link', { name: paths.spells.displayName }),
    ).toHaveAttribute('href', paths.spells.path);
  });

  it('groups the catalog links inside a list for screen readers', () => {
    renderHero();

    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });
});
