import { Theme } from '@radix-ui/themes';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import type { SpellSummary } from '@/features/spells/api';
import { createTestQueryClient } from '@/testing/setup';

import { SpellCard } from '../spell-card';

const FIREBALL: SpellSummary = {
  id: 'aa8e3a8f-ecff-4bd8-8599-91be398c01a3',
  slug: 'fireball',
  name: 'Fireball',
  level: '3rd',
  school: 'evocation',
};

const SCHOOLLESS: SpellSummary = {
  id: 'da9903eb-a661-4b1e-a571-9d6a426d8fd5',
  slug: 'some-spell',
  name: 'Some Spell',
  level: 'Cantrip',
  school: null,
};

function renderCard(spell: SpellSummary) {
  const queryClient = createTestQueryClient();
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <MemoryRouter>
            <SpellCard spell={spell} />
          </MemoryRouter>
        </Theme>
      </QueryClientProvider>,
    ),
  };
}

describe('SpellCard', () => {
  it('renders the spell name', () => {
    renderCard(FIREBALL);
    expect(screen.getByText('Fireball')).toBeInTheDocument();
  });

  it('renders the spell school', () => {
    renderCard(FIREBALL);
    expect(screen.getByText('evocation')).toBeInTheDocument();
  });

  it('renders the level display string', () => {
    renderCard(FIREBALL);
    expect(screen.getByText('3rd')).toBeInTheDocument();
  });

  it('falls back to "Unknown" when school is null', () => {
    renderCard(SCHOOLLESS);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('links to the spell detail page using the slug', () => {
    renderCard(FIREBALL);
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/spells/fireball',
    );
  });

  it('exposes the slug via data-spell for keyboard navigation hand-off', () => {
    renderCard(FIREBALL);
    expect(screen.getByRole('link')).toHaveAttribute('data-spell', 'fireball');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderCard(FIREBALL);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('warms the spell detail cache on pointer enter', async () => {
    const { queryClient } = renderCard(FIREBALL);
    const prefetchSpy = vi
      .spyOn(queryClient, 'prefetchQuery')
      .mockResolvedValue(undefined);

    fireEvent.mouseEnter(screen.getByRole('link'));

    await waitFor(() => {
      expect(prefetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['spells', 'detail', 'fireball'] }),
      );
    });
  });
});
