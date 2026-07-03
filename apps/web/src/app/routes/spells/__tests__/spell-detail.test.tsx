import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import type { ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { fireballSpell } from '@/features/spells/__tests__/fireball-fixture';
import { apiClient } from '@/lib/api-client';
import { AuthProvider } from '@/lib/auth';

import SpellDetail from '../spell-detail';

const API_RESPONSE = {
  id: fireballSpell.id,
  slug: fireballSpell.slug,
  name: fireballSpell.name,
  level: fireballSpell.level,
  school: fireballSpell.school,
  content: fireballSpell.content,
  contentSource: fireballSpell.contentSource,
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
        <AuthProvider>
          <HelmetProvider>
            <Theme>
              <MemoryRouter initialEntries={[`/spells/${fireballSpell.slug}`]}>
                <Routes>
                  <Route element={children} path="/spells/:slug" />
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
      <SpellDetail />
    </Wrapper>,
  );
}

describe('SpellDetail route', () => {
  it('fetches the spell by slug and renders the detail block', async () => {
    mock.onGet(`/v1/spells/${fireballSpell.slug}`).reply(200, API_RESPONSE);

    renderDetail();

    expect(
      await screen.findByRole('heading', { level: 1, name: /fireball/i }),
    ).toBeInTheDocument();
  });

  it('renders all required stat fields', async () => {
    mock.onGet(`/v1/spells/${fireballSpell.slug}`).reply(200, API_RESPONSE);

    renderDetail();
    await screen.findByRole('heading', { level: 1 });

    expect(screen.getByText('1 action')).toBeInTheDocument();
    expect(screen.getByText('150 feet')).toBeInTheDocument();
    expect(screen.getByText(/V, S, M/)).toBeInTheDocument();
    expect(screen.getByText('Instantaneous')).toBeInTheDocument();
  });

  it('renders the description paragraphs', async () => {
    mock.onGet(`/v1/spells/${fireballSpell.slug}`).reply(200, API_RESPONSE);

    renderDetail();
    await screen.findByRole('heading', { level: 1 });

    expect(screen.getByText(/A bright streak flashes/)).toBeInTheDocument();
  });

  it('renders the At Higher Levels section', async () => {
    mock.onGet(`/v1/spells/${fireballSpell.slug}`).reply(200, API_RESPONSE);

    renderDetail();
    await screen.findByRole('heading', { level: 1 });

    expect(
      screen.getByRole('heading', { name: /at higher levels/i }),
    ).toBeInTheDocument();
  });

  it('renders the attribution footer when data resolves', async () => {
    mock.onGet(`/v1/spells/${fireballSpell.slug}`).reply(200, API_RESPONSE);

    renderDetail();

    expect(
      await screen.findByRole('link', { name: 'CC BY 4.0' }),
    ).toBeInTheDocument();
  });

  it('renders a back link to the spells list', async () => {
    mock.onGet(`/v1/spells/${fireballSpell.slug}`).reply(200, API_RESPONSE);

    renderDetail();
    await screen.findByRole('heading', { level: 1 });

    expect(
      screen.getByRole('link', { name: /back to spells/i }),
    ).toHaveAttribute('href', '/spells');
  });

  it('renders the loading skeleton (aria-busy) on first load', () => {
    mock
      .onGet(`/v1/spells/${fireballSpell.slug}`)
      .reply(() => new Promise(() => undefined));

    const { container } = renderDetail();

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('renders "Spell not found." on 404', async () => {
    mock.onGet(`/v1/spells/${fireballSpell.slug}`).reply(404, {
      status: 404,
      developerMessage: `Spell not found: ${fireballSpell.slug}`,
      userMessage: 'That spell could not be found.',
      errorCode: 'spell_not_found',
      moreInfo: '',
    });

    renderDetail();

    expect(await screen.findByText(/spell not found/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 1, name: /fireball/i }),
    ).not.toBeInTheDocument();
  });

  it('renders a generic error callout on non-404 failures', async () => {
    mock.onGet(`/v1/spells/${fireballSpell.slug}`).reply(500, {
      status: 500,
      developerMessage: 'Database is down',
      userMessage: 'Something went wrong on our end.',
      errorCode: 'internal_error',
      moreInfo: '',
    });

    renderDetail();

    expect(
      await screen.findByText(/could not load spell/i),
    ).toBeInTheDocument();
  });

  it('has no accessibility violations once the detail block renders', async () => {
    mock.onGet(`/v1/spells/${fireballSpell.slug}`).reply(200, API_RESPONSE);

    const { container } = renderDetail();
    await screen.findByRole('heading', { level: 1 });

    expect(await axe(container)).toHaveNoViolations();
  });
});
