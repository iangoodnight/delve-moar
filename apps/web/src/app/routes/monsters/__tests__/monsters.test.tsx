import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { apiClient } from '@/lib/api-client';

import Monsters from '../monsters';

const EMPTY_RESPONSE = {
  data: [],
  metadata: {
    resultset: { count: 0, offset: 0, limit: 20 },
    links: { prev: null, next: null },
  },
};

const mock = new MockAdapter(apiClient);

beforeEach(() => {
  // Default to an empty resultset so the page settles on the empty state
  // (a stable, rendered DOM that axe can inspect without flicker).
  mock.onGet('/v1/monsters').reply(200, EMPTY_RESPONSE);
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
          <MemoryRouter initialEntries={['/monsters']}>
            <Monsters />
          </MemoryRouter>
        </Theme>
      </HelmetProvider>
    </QueryClientProvider>,
  );
}

describe('Monsters route', () => {
  it('renders the page heading', () => {
    renderRoute();
    expect(
      screen.getByRole('heading', { level: 1, name: /monsters/i }),
    ).toBeInTheDocument();
  });

  it('renders the search and filter controls', () => {
    renderRoute();
    expect(screen.getByPlaceholderText(/search monsters/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CR min/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CR max/i)).toBeInTheDocument();
  });

  it('has no accessibility violations once the empty state has rendered', async () => {
    const { container } = renderRoute();
    // Wait for the grid to settle — axe should evaluate the post-loading DOM,
    // not the skeleton flash.
    await screen.findByText(/no monsters found/i);
    expect(await axe(container)).toHaveNoViolations();
  });
});
