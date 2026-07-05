import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { apiClient } from '@/lib/api-client';
import { renderWithProvider } from '@/testing/setup';

import { DeleteBookDialog } from '../delete-book-dialog';

const BOOK_ID = '11111111-1111-1111-1111-111111111111';
const mock = new MockAdapter(apiClient);

function renderDialog() {
  return renderWithProvider(
    <DeleteBookDialog bookId={BOOK_ID} bookName="Curse of Strahd prep">
      <button type="button">Delete</button>
    </DeleteBookDialog>,
  );
}

afterEach(() => {
  mock.reset();
});

describe('DeleteBookDialog', () => {
  it('confirms and deletes the book', async () => {
    const user = userEvent.setup();
    mock.onDelete(`/v1/books/${BOOK_ID}`).reply(204);
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete book' }));

    await waitFor(() => {
      expect(mock.history.delete).toHaveLength(1);
    });
  });

  it('does not delete when cancelled', async () => {
    const user = userEvent.setup();
    mock.onDelete(`/v1/books/${BOOK_ID}`).reply(204);
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mock.history.delete).toHaveLength(0);
  });

  it('has no accessibility violations when open', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(await axe(dialog)).toHaveNoViolations();
  });
});
