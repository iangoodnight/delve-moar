import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { renderWithProvider } from '@/testing/setup';

import type { BookSummary } from '../../api/get-books';
import { BookCard } from '../book-card';

const BOOK: BookSummary = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Curse of Strahd prep',
  slug: null,
  description: 'Stat blocks and items for the Barovia arc.',
  isPublic: false,
  isSystem: false,
  owner: { username: 'mara' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-06-27T00:00:00Z',
};

function renderCard(book: BookSummary = BOOK) {
  return renderWithProvider(
    <MemoryRouter>
      <BookCard book={book} />
    </MemoryRouter>,
  );
}

describe('BookCard', () => {
  it('links the name to the book detail', () => {
    renderCard();

    expect(
      screen.getByRole('link', { name: 'Curse of Strahd prep' }),
    ).toHaveAttribute('href', `/account/books/${BOOK.id}`);
  });

  it('renders the description', () => {
    renderCard();
    expect(
      screen.getByText('Stat blocks and items for the Barovia arc.'),
    ).toBeInTheDocument();
  });

  it('omits the description when the book has none', () => {
    renderCard({ ...BOOK, description: null });
    expect(
      screen.queryByText('Stat blocks and items for the Barovia arc.'),
    ).not.toBeInTheDocument();
  });

  it('exposes labelled edit and delete actions', () => {
    renderCard();

    expect(
      screen.getByRole('button', { name: 'Edit Curse of Strahd prep' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Delete Curse of Strahd prep' }),
    ).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderCard();
    expect(await axe(container)).toHaveNoViolations();
  });
});
