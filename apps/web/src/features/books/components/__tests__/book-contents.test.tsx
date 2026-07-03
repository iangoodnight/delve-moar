import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { apiClient } from '@/lib/api-client';

import type { Book } from '../../api/get-book';
import { BookContents } from '../book-contents';

const mock = new MockAdapter(apiClient);
const BOOK_ID = '11111111-1111-1111-1111-111111111111';

const BOOK: Book = {
  id: BOOK_ID,
  name: 'Curse of Strahd prep',
  slug: null,
  description: null,
  isPublic: false,
  isSystem: false,
  owner: { username: 'mara' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-06-27T00:00:00Z',
  monsterCount: 1,
  spellCount: 1,
  itemCount: 0,
};

function page(data: unknown[]) {
  return {
    data,
    metadata: {
      resultset: { count: data.length, offset: 0, limit: 20 },
      links: { prev: null, next: null },
    },
  };
}

function HashProbe() {
  const location = useLocation();
  return <div data-testid="hash">{location.hash}</div>;
}

function renderContents() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <Theme>
          <MemoryRouter initialEntries={[`/account/books/${BOOK_ID}`]}>
            <BookContents book={BOOK} />
            <HashProbe />
          </MemoryRouter>
        </Theme>
      </HelmetProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mock.onGet(`/v1/books/${BOOK_ID}/monsters`).reply(
    200,
    page([
      {
        slug: 'goblin',
        name: 'Goblin',
        monsterType: 'humanoid',
        challengeRating: '1/4',
      },
    ]),
  );
  mock
    .onGet(`/v1/books/${BOOK_ID}/spells`)
    .reply(
      200,
      page([
        { slug: 'fireball', name: 'Fireball', level: '3', school: 'evocation' },
      ]),
    );
  mock.onGet(`/v1/books/${BOOK_ID}/items`).reply(200, page([]));
});

afterEach(() => {
  mock.reset();
});

describe('BookContents', () => {
  it('renders a tab per content type with counts', () => {
    renderContents();
    expect(
      screen.getByRole('tab', { name: /monsters \(1\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /spells \(1\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /items \(0\)/i }),
    ).toBeInTheDocument();
  });

  it('defaults to the monsters tab and lists its content', async () => {
    renderContents();
    expect(
      await screen.findByRole('link', { name: 'Goblin' }),
    ).toBeInTheDocument();
  });

  it('switches tabs and reflects the active tab in the URL hash', async () => {
    const user = userEvent.setup();
    renderContents();
    await screen.findByRole('link', { name: 'Goblin' });

    await user.click(screen.getByRole('tab', { name: /spells/i }));

    expect(
      await screen.findByRole('link', { name: 'Fireball' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('hash')).toHaveTextContent('#spells');
  });

  it('keeps a tab search when switching away and back (hoisted state)', async () => {
    const user = userEvent.setup();
    renderContents();
    const search = await screen.findByPlaceholderText('Search monsters...');
    await user.type(search, 'gob');

    await user.click(screen.getByRole('tab', { name: /spells/i }));
    await screen.findByPlaceholderText('Search spells...');
    await user.click(screen.getByRole('tab', { name: /monsters/i }));

    expect(
      await screen.findByPlaceholderText('Search monsters...'),
    ).toHaveValue('gob');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderContents();
    await screen.findByRole('link', { name: 'Goblin' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
