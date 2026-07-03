import type { Meta, StoryObj } from '@storybook/react-vite';

import type { BookSummary } from '../api/get-books';

import { AddToBookControl } from './add-to-book-control';
import {
  booksApiMock,
  DEMO_BOOK,
  DEMO_USER,
  withAuthProviders,
} from './book-story-helpers';

const CONTENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const SECOND_BOOK: BookSummary = {
  ...DEMO_BOOK,
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Homebrew drafts',
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

function signIn() {
  document.cookie = 'dm_csrf=story-token';
  booksApiMock.onGet('/v1/auth/me').reply(200, DEMO_USER);
}

const meta: Meta<typeof AddToBookControl> = {
  title: 'Features/Books/AddToBookControl',
  component: AddToBookControl,
  parameters: {
    docs: {
      description: {
        component:
          'On a content detail page, saves the item to the reader’s ' +
          'books. Anonymous visitors get a muted control that opens a ' +
          'sign-in popover; signed-in visitors get a checklist of their ' +
          'books. Open the control to see the menu.',
      },
    },
  },
  args: { contentType: 'monster', contentId: CONTENT_ID, memberships: [] },
  decorators: [withAuthProviders],
  beforeEach: () => {
    booksApiMock.reset();
    document.cookie = 'dm_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  },
};

export default meta;

type Story = StoryObj<typeof AddToBookControl>;

// Signed out: a muted control that opens a sign-in popover.
export const Anonymous: Story = {};

export const NoBooksYet: Story = {
  beforeEach: () => {
    signIn();
    booksApiMock.onGet('/v1/books').reply(200, booksList([]));
  },
};

export const WithBooks: Story = {
  args: {
    memberships: [
      { id: DEMO_BOOK.id, name: DEMO_BOOK.name, slug: DEMO_BOOK.slug },
    ],
  },
  beforeEach: () => {
    signIn();
    booksApiMock
      .onGet('/v1/books')
      .reply(200, booksList([DEMO_BOOK, SECOND_BOOK]));
  },
};
