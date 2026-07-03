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
import { AuthProvider } from '@/lib/auth';

import MonsterDetail from '../monster-detail';

const API_RESPONSE = {
  id: adultRedDragonMonster.id,
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
        <AuthProvider>
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
        </AuthProvider>
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

  it('renders the loading skeleton (aria-busy) on first load', () => {
    // Resolve never — keeps the query in pending state long enough to assert
    // the skeleton container is visible.
    mock
      .onGet(`/v1/monsters/${adultRedDragonMonster.slug}`)
      .reply(() => new Promise(() => undefined));

    const { container } = renderDetail();

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('renders "Monster not found." on 404', async () => {
    mock.onGet(`/v1/monsters/${adultRedDragonMonster.slug}`).reply(404, {
      status: 404,
      developerMessage: `Monster not found: ${adultRedDragonMonster.slug}`,
      userMessage: 'That monster could not be found.',
      errorCode: 'monster_not_found',
      moreInfo: '',
    });

    renderDetail();

    expect(await screen.findByText(/monster not found/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 1, name: /adult red dragon/i }),
    ).not.toBeInTheDocument();
  });

  it('renders a generic error callout on non-404 failures', async () => {
    mock.onGet(`/v1/monsters/${adultRedDragonMonster.slug}`).reply(500, {
      status: 500,
      developerMessage: 'Database is down',
      userMessage: 'Something went wrong on our end.',
      errorCode: 'internal_error',
      moreInfo: '',
    });

    renderDetail();

    expect(
      await screen.findByText(/could not load monster/i),
    ).toBeInTheDocument();
  });
});
