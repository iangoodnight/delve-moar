import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { apiClient } from '@/lib/api-client';
import { renderWithProvider } from '@/testing/setup';

import type { BookSummary } from '../../api/get-books';
import { BookFormDialog } from '../book-form-dialog';

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

afterEach(() => {
  mock.reset();
});

describe('BookFormDialog', () => {
  it('opens the dialog from its trigger', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <BookFormDialog>
        <button type="button">New book</button>
      </BookFormDialog>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New book' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('blocks an empty submission and shows a validation error', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <BookFormDialog>
        <button type="button">New book</button>
      </BookFormDialog>,
    );

    await user.click(screen.getByRole('button', { name: 'New book' }));
    await user.click(screen.getByRole('button', { name: 'Create book' }));

    expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
  });

  it('creates a book with the entered name and description', async () => {
    const user = userEvent.setup();
    mock.onPost('/v1/books').reply(201, BOOK);
    renderWithProvider(
      <BookFormDialog>
        <button type="button">New book</button>
      </BookFormDialog>,
    );

    await user.click(screen.getByRole('button', { name: 'New book' }));
    await user.type(screen.getByLabelText('Name'), 'Curse of Strahd prep');
    await user.type(screen.getByLabelText('Description'), 'Barovia.');
    await user.click(screen.getByRole('button', { name: 'Create book' }));

    await waitFor(() => {
      expect(mock.history.post).toHaveLength(1);
    });
    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({
      name: 'Curse of Strahd prep',
      description: 'Barovia.',
    });
  });

  it('pre-fills the fields when editing and sends a PATCH', async () => {
    const user = userEvent.setup();
    mock
      .onPatch(`/v1/books/${BOOK.id}`)
      .reply(200, { ...BOOK, name: 'Renamed' });
    renderWithProvider(
      <BookFormDialog book={BOOK}>
        <button type="button">Edit</button>
      </BookFormDialog>,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(
      await screen.findByDisplayValue('Curse of Strahd prep'),
    ).toBeInTheDocument();

    const nameField = screen.getByLabelText('Name');
    await user.clear(nameField);
    await user.type(nameField, 'Renamed');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mock.history.patch).toHaveLength(1);
    });
    expect(JSON.parse(mock.history.patch[0]?.data as string)).toMatchObject({
      name: 'Renamed',
    });
  });

  it('has no accessibility violations when open', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <BookFormDialog>
        <button type="button">New book</button>
      </BookFormDialog>,
    );

    await user.click(screen.getByRole('button', { name: 'New book' }));
    const dialog = await screen.findByRole('dialog');
    expect(await axe(dialog)).toHaveNoViolations();
  });
});
