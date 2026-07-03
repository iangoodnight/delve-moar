import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { apiClient } from '@/lib/api-client';
import { renderWithProvider } from '@/testing/setup';

import type { BookSummary } from '../../api/get-books';
import { AddToBookControl } from '../add-to-book-control';

const mock = new MockAdapter(apiClient);
const CONTENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const USER = {
  id: '99999999-9999-9999-9999-999999999999',
  username: 'mara',
  email: 'mara@example.com',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
};

const BOOK: BookSummary = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  name: 'Curse of Strahd prep',
  slug: null,
  description: null,
  isPublic: false,
  isSystem: false,
  owner: { username: 'mara' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-06-27T00:00:00Z',
};

function booksList(books: BookSummary[]) {
  return {
    data: books,
    metadata: {
      resultset: { count: books.length, offset: 0, limit: 100 },
      links: { prev: null, next: null },
    },
  };
}

function renderControl() {
  return renderWithProvider(
    <MemoryRouter initialEntries={['/monsters/goblin']}>
      <AddToBookControl
        contentId={CONTENT_ID}
        contentType="monster"
        memberships={[]}
      />
    </MemoryRouter>,
  );
}

function signIn() {
  document.cookie = 'dm_csrf=token';
  mock.onGet('/v1/auth/me').reply(200, USER);
}

afterEach(() => {
  mock.reset();
  document.cookie = 'dm_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

describe('AddToBookControl', () => {
  it('prompts anonymous visitors to log in', async () => {
    const user = userEvent.setup();
    renderControl();

    await user.click(screen.getByRole('button', { name: /add to book/i }));
    expect(
      await screen.findByRole('link', { name: /log in/i }),
    ).toHaveAttribute('href', '/login');
  });

  it("lists the signed-in user's books and adds on toggle", async () => {
    const user = userEvent.setup();
    signIn();
    mock.onGet('/v1/books').reply(200, booksList([BOOK]));
    mock.onPut(`/v1/books/${BOOK.id}/monsters/${CONTENT_ID}`).reply(204);
    renderControl();

    // Wait for auth to resolve: while loading, the anon prompt renders a
    // same-labeled button, so gate on the menu trigger before clicking.
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /add to book/i }),
      ).toHaveAttribute('aria-haspopup', 'menu');
    });
    await user.click(screen.getByRole('button', { name: /add to book/i }));
    await user.click(
      await screen.findByRole('menuitemcheckbox', {
        name: 'Curse of Strahd prep',
      }),
    );

    await waitFor(() => {
      expect(mock.history.put).toHaveLength(1);
    });
  });
});
