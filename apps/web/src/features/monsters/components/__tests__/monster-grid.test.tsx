import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { apiClient } from '@/lib/api-client';

import { MonsterGrid } from '../monster-grid';

const SAMPLE_MONSTER = {
  slug: 'adult-red-dragon',
  name: 'Adult Red Dragon',
  monsterType: 'dragon',
  challengeRating: '17',
};

const EMPTY_RESPONSE = {
  data: [],
  metadata: {
    resultset: { count: 0, offset: 0, limit: 20 },
    links: { prev: null, next: null },
  },
};

const SINGLE_PAGE_RESPONSE = {
  data: [SAMPLE_MONSTER],
  metadata: {
    resultset: { count: 1, offset: 0, limit: 20 },
    links: { prev: null, next: null },
  },
};

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
});

function makeWrapper() {
  // Fresh QueryClient per render so cache state from one test never leaks
  // into another.  retry: false so error states surface on the first failure.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <Theme>
          <MemoryRouter>{children}</MemoryRouter>
        </Theme>
      </QueryClientProvider>
    );
  }
  return Wrapper;
}

function renderGrid() {
  const Wrapper = makeWrapper();
  return render(
    <Wrapper>
      <MonsterGrid />
    </Wrapper>,
  );
}

describe('MonsterGrid', () => {
  it('renders the loading grid (aria-busy) on first page load', () => {
    // Resolve never — keeps the query in pending state long enough to assert
    // the skeleton grid is visible.
    mock.onGet('/v1/monsters').reply(() => new Promise(() => undefined));

    const { container } = renderGrid();

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('renders monster cards when data resolves', async () => {
    mock.onGet('/v1/monsters').reply(200, SINGLE_PAGE_RESPONSE);

    renderGrid();

    expect(await screen.findByText('Adult Red Dragon')).toBeInTheDocument();
  });

  it('renders an empty state when the results array is empty', async () => {
    mock.onGet('/v1/monsters').reply(200, EMPTY_RESPONSE);

    renderGrid();

    expect(await screen.findByText(/no monsters found/i)).toBeInTheDocument();
  });

  it('renders an error state when the API call fails', async () => {
    mock.onGet('/v1/monsters').reply(500, {
      status: 500,
      developerMessage: 'Database is down',
      userMessage: 'Something went wrong on our end.',
      errorCode: 'internal_error',
      moreInfo: '',
    });

    renderGrid();

    expect(
      await screen.findByText(/could not load monsters/i),
    ).toBeInTheDocument();
  });
});
