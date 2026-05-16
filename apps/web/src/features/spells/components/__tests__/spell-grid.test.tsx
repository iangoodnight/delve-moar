import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { apiClient } from '@/lib/api-client';

import { SpellGrid } from '../spell-grid';

const SAMPLE_SPELL = {
  slug: 'fireball',
  name: 'Fireball',
  level: '3rd',
  school: 'evocation',
};

const EMPTY_RESPONSE = {
  data: [],
  metadata: {
    resultset: { count: 0, offset: 0, limit: 20 },
    links: { prev: null, next: null },
  },
};

const SINGLE_PAGE_RESPONSE = {
  data: [SAMPLE_SPELL],
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
      <SpellGrid />
    </Wrapper>,
  );
}

describe('SpellGrid', () => {
  it('renders the loading grid (aria-busy) on first page load', () => {
    mock.onGet('/v1/spells').reply(() => new Promise(() => undefined));

    const { container } = renderGrid();

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('renders spell cards when data resolves', async () => {
    mock.onGet('/v1/spells').reply(200, SINGLE_PAGE_RESPONSE);

    renderGrid();

    expect(await screen.findByText('Fireball')).toBeInTheDocument();
  });

  it('renders an empty state when the results array is empty', async () => {
    mock.onGet('/v1/spells').reply(200, EMPTY_RESPONSE);

    renderGrid();

    expect(await screen.findByText(/no spells found/i)).toBeInTheDocument();
  });

  it('renders an error state when the API call fails', async () => {
    mock.onGet('/v1/spells').reply(500, {
      status: 500,
      developerMessage: 'Database is down',
      userMessage: 'Something went wrong on our end.',
      errorCode: 'internal_error',
      moreInfo: '',
    });

    renderGrid();

    expect(
      await screen.findByText(/could not load spells/i),
    ).toBeInTheDocument();
  });
});
