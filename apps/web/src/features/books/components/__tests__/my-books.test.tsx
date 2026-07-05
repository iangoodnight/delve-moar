import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { apiClient } from '@/lib/api-client';

import type { BookListResponse, BookSummary } from '../../api/get-books';
import { MyBooks } from '../my-books';

const mock = new MockAdapter(apiClient);

const BOOK: BookSummary = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Curse of Strahd prep',
  slug: null,
  description: 'Barovia.',
  isPublic: false,
  isSystem: false,
  owner: { username: 'mara' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-06-27T00:00:00Z',
};

function listResponse(books: BookSummary[]): BookListResponse {
  return {
    data: books,
    metadata: {
      resultset: { count: books.length, offset: 0, limit: 100 },
      links: { prev: null, next: null },
    },
  };
}

function renderMyBooks() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <Theme>
          <MemoryRouter>
            <MyBooks />
          </MemoryRouter>
        </Theme>
      </HelmetProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  mock.reset();
});

describe('MyBooks', () => {
  it('requests only the books the user owns', async () => {
    mock.onGet('/v1/books').reply(200, listResponse([]));
    renderMyBooks();

    await screen.findByText('No books yet');
    expect(mock.history.get[0]?.params).toMatchObject({ scope: 'owned' });
  });

  it('shows the empty state when there are no books', async () => {
    mock.onGet('/v1/books').reply(200, listResponse([]));
    renderMyBooks();

    expect(await screen.findByText('No books yet')).toBeInTheDocument();
  });

  it('renders a card for each owned book', async () => {
    mock.onGet('/v1/books').reply(200, listResponse([BOOK]));
    renderMyBooks();

    expect(
      await screen.findByRole('link', { name: 'Curse of Strahd prep' }),
    ).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    mock.onGet('/v1/books').reply(500, {
      status: 500,
      errorCode: 'INTERNAL',
      developerMessage: 'boom',
      userMessage: 'Boom.',
      moreInfo: '',
    });
    renderMyBooks();

    expect(
      await screen.findByText(/could not load your books/i),
    ).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    mock.onGet('/v1/books').reply(200, listResponse([BOOK]));
    const { container } = renderMyBooks();

    await screen.findByRole('link', { name: 'Curse of Strahd prep' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
