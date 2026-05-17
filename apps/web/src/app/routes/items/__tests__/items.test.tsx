import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { apiClient } from '@/lib/api-client';

import Items from '../items';

const EMPTY_RESPONSE = {
  data: [],
  metadata: {
    resultset: { count: 0, offset: 0, limit: 20 },
    links: { prev: null, next: null },
  },
};

const mock = new MockAdapter(apiClient);

beforeEach(() => {
  mock.onGet('/v1/items').reply(200, EMPTY_RESPONSE);
});

afterEach(() => {
  mock.reset();
});

function renderRoute() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <Theme>
          <MemoryRouter initialEntries={['/items']}>
            <Items />
          </MemoryRouter>
        </Theme>
      </HelmetProvider>
    </QueryClientProvider>,
  );
}

describe('Items route', () => {
  it('renders the page heading', () => {
    renderRoute();
    expect(
      screen.getByRole('heading', { level: 1, name: /items/i }),
    ).toBeInTheDocument();
  });

  it('renders the search and filter controls', () => {
    renderRoute();
    expect(screen.getByPlaceholderText(/search items/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rarity/i)).toBeInTheDocument();
  });

  it('has no accessibility violations once the empty state has rendered', async () => {
    const { container } = renderRoute();
    await screen.findByText(/no items found/i);
    expect(await axe(container)).toHaveNoViolations();
  });
});
