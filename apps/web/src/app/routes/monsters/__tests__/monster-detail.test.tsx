import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import type { ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { adultRedDragonMonster } from '@/features/monsters/__tests__/adult-red-dragon-fixture';
import { apiClient } from '@/lib/api-client';

import MonsterDetail from '../monster-detail';

const API_RESPONSE = {
  slug: adultRedDragonMonster.slug,
  name: adultRedDragonMonster.name,
  monsterType: adultRedDragonMonster.monsterType,
  challengeRating: adultRedDragonMonster.challengeRating,
  content: adultRedDragonMonster.content,
  contentSource: adultRedDragonMonster.contentSource,
};

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
});

function makeWrapper() {
  // Fresh QueryClient per render so cache state from one test never leaks
  // into another. retry: false so error states surface on the first failure.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <Theme>
            <MemoryRouter
              initialEntries={[`/monsters/${adultRedDragonMonster.slug}`]}
            >
              <Routes>
                <Route element={children} path="/monsters/:slug" />
              </Routes>
            </MemoryRouter>
          </Theme>
        </HelmetProvider>
      </QueryClientProvider>
    );
  }
  return Wrapper;
}

function renderDetail() {
  const Wrapper = makeWrapper();
  return render(
    <Wrapper>
      <MonsterDetail />
    </Wrapper>,
  );
}

describe('MonsterDetail route', () => {
  it('fetches the monster by slug and renders the stat block', async () => {
    mock
      .onGet(`/v1/monsters/${adultRedDragonMonster.slug}`)
      .reply(200, API_RESPONSE);

    renderDetail();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /adult red dragon/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Huge dragon, chaotic evil/)).toBeInTheDocument();
  });

  it('renders the attribution footer when data resolves', async () => {
    mock
      .onGet(`/v1/monsters/${adultRedDragonMonster.slug}`)
      .reply(200, API_RESPONSE);

    renderDetail();

    expect(
      await screen.findByRole('link', { name: 'CC BY 4.0' }),
    ).toBeInTheDocument();
  });

  it('renders a back link to the monsters list', async () => {
    mock
      .onGet(`/v1/monsters/${adultRedDragonMonster.slug}`)
      .reply(200, API_RESPONSE);

    renderDetail();
    await screen.findByRole('heading', { level: 1 });

    expect(
      screen.getByRole('link', { name: /back to monsters/i }),
    ).toHaveAttribute('href', '/monsters');
  });

  it('has no accessibility violations once the stat block renders', async () => {
    mock
      .onGet(`/v1/monsters/${adultRedDragonMonster.slug}`)
      .reply(200, API_RESPONSE);

    const { container } = renderDetail();
    await screen.findByRole('heading', { level: 1 });

    expect(await axe(container)).toHaveNoViolations();
  });
});
