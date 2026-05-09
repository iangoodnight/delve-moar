import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import type { MonsterSummary } from '@/features/monsters/api';

import { MonsterCard } from '../monster-card';

const ADULT_RED_DRAGON: MonsterSummary = {
  slug: 'adult-red-dragon',
  name: 'Adult Red Dragon',
  monsterType: 'dragon',
  challengeRating: '17',
};

const UNTYPED: MonsterSummary = {
  slug: 'something-strange',
  name: 'Something Strange',
  monsterType: null,
  challengeRating: '5',
};

function renderCard(monster: MonsterSummary) {
  return render(
    <Theme>
      <MemoryRouter>
        <MonsterCard monster={monster} />
      </MemoryRouter>
    </Theme>,
  );
}

describe('MonsterCard', () => {
  it('renders the monster name', () => {
    renderCard(ADULT_RED_DRAGON);
    expect(screen.getByText('Adult Red Dragon')).toBeInTheDocument();
  });

  it('renders the monster type', () => {
    renderCard(ADULT_RED_DRAGON);
    expect(screen.getByText('dragon')).toBeInTheDocument();
  });

  it('renders the challenge rating prefixed with CR', () => {
    renderCard(ADULT_RED_DRAGON);
    expect(screen.getByText('CR 17')).toBeInTheDocument();
  });

  it('falls back to "Unknown" when monsterType is null', () => {
    renderCard(UNTYPED);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('links to the monster detail page using the slug', () => {
    renderCard(ADULT_RED_DRAGON);
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/monsters/adult-red-dragon',
    );
  });

  it('exposes the slug via data-monster for keyboard navigation hand-off', () => {
    renderCard(ADULT_RED_DRAGON);
    expect(screen.getByRole('link')).toHaveAttribute(
      'data-monster',
      'adult-red-dragon',
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = renderCard(ADULT_RED_DRAGON);
    expect(await axe(container)).toHaveNoViolations();
  });
});
