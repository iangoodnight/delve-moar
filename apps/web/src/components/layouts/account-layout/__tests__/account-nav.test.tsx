import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { renderWithProvider } from '@/testing/setup';

import { AccountNav } from '../account-nav';

function renderNav(path = '/account') {
  return renderWithProvider(
    <MemoryRouter initialEntries={[path]}>
      <AccountNav />
    </MemoryRouter>,
  );
}

describe('AccountNav', () => {
  it('links to the account and books sections', () => {
    renderNav();

    expect(screen.getByRole('link', { name: /account/i })).toHaveAttribute(
      'href',
      '/account',
    );
    expect(screen.getByRole('link', { name: /my books/i })).toHaveAttribute(
      'href',
      '/account/books',
    );
  });

  it('marks the active section with aria-current', () => {
    renderNav('/account/books');

    expect(screen.getByRole('link', { name: /my books/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: /account/i })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = renderNav();
    expect(await axe(container)).toHaveNoViolations();
  });
});
