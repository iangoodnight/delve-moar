import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { renderWithProvider } from '@/testing/setup';

import { BooksEmptyState } from '../books-empty-state';

describe('BooksEmptyState', () => {
  it('renders the heading and call to action', () => {
    renderWithProvider(<BooksEmptyState />);

    expect(
      screen.getByRole('heading', { name: 'No books yet' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create your first book/i }),
    ).toBeInTheDocument();
  });

  it('opens the create dialog from the call to action', async () => {
    const user = userEvent.setup();
    renderWithProvider(<BooksEmptyState />);

    await user.click(
      screen.getByRole('button', { name: /create your first book/i }),
    );
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProvider(<BooksEmptyState />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
