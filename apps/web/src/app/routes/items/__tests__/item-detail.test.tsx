import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import type { ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { longswordItem } from '@/features/items/__tests__/longsword-fixture';
import { apiClient } from '@/lib/api-client';

import ItemDetail from '../item-detail';

const API_RESPONSE = {
  slug: longswordItem.slug,
  name: longswordItem.name,
  itemCategory: longswordItem.itemCategory,
  rarity: longswordItem.rarity,
  content: longswordItem.content,
  contentSource: longswordItem.contentSource,
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
        <HelmetProvider>
          <Theme>
            <MemoryRouter initialEntries={[`/items/${longswordItem.slug}`]}>
              <Routes>
                <Route element={children} path="/items/:slug" />
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
      <ItemDetail />
    </Wrapper>,
  );
}

describe('ItemDetail route', () => {
  it('fetches the item by slug and renders the detail block', async () => {
    mock.onGet(`/v1/items/${longswordItem.slug}`).reply(200, API_RESPONSE);

    renderDetail();

    expect(
      await screen.findByRole('heading', { level: 1, name: /longsword/i }),
    ).toBeInTheDocument();
  });

  it('renders the core stat fields for a weapon', async () => {
    mock.onGet(`/v1/items/${longswordItem.slug}`).reply(200, API_RESPONSE);

    renderDetail();
    await screen.findByRole('heading', { level: 1 });

    expect(screen.getByText('15 gp')).toBeInTheDocument();
    expect(screen.getByText('3 lb.')).toBeInTheDocument();
    expect(screen.getByText('1d8 slashing')).toBeInTheDocument();
  });

  it('renders the attribution footer when data resolves', async () => {
    mock.onGet(`/v1/items/${longswordItem.slug}`).reply(200, API_RESPONSE);

    renderDetail();

    expect(
      await screen.findByRole('link', { name: 'CC BY 4.0' }),
    ).toBeInTheDocument();
  });

  it('renders a back link to the items list', async () => {
    mock.onGet(`/v1/items/${longswordItem.slug}`).reply(200, API_RESPONSE);

    renderDetail();
    await screen.findByRole('heading', { level: 1 });

    expect(
      screen.getByRole('link', { name: /back to items/i }),
    ).toHaveAttribute('href', '/items');
  });

  it('renders the loading skeleton (aria-busy) on first load', () => {
    mock
      .onGet(`/v1/items/${longswordItem.slug}`)
      .reply(() => new Promise(() => undefined));

    const { container } = renderDetail();

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('renders "Item not found." on 404', async () => {
    mock.onGet(`/v1/items/${longswordItem.slug}`).reply(404, {
      status: 404,
      developerMessage: `Item not found: ${longswordItem.slug}`,
      userMessage: 'That item could not be found.',
      errorCode: 'item_not_found',
      moreInfo: '',
    });

    renderDetail();

    expect(await screen.findByText(/item not found/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 1, name: /longsword/i }),
    ).not.toBeInTheDocument();
  });

  it('renders a generic error callout on non-404 failures', async () => {
    mock.onGet(`/v1/items/${longswordItem.slug}`).reply(500, {
      status: 500,
      developerMessage: 'Database is down',
      userMessage: 'Something went wrong on our end.',
      errorCode: 'internal_error',
      moreInfo: '',
    });

    renderDetail();

    expect(await screen.findByText(/could not load item/i)).toBeInTheDocument();
  });

  it('has no accessibility violations once the detail block renders', async () => {
    mock.onGet(`/v1/items/${longswordItem.slug}`).reply(200, API_RESPONSE);

    const { container } = renderDetail();
    await screen.findByRole('heading', { level: 1 });

    expect(await axe(container)).toHaveNoViolations();
  });
});
