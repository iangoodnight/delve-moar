import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { apiClient } from '@/lib/api-client';
import { renderWithProvider } from '@/testing/setup';

import { MobileMenu } from '../mobile-menu';

const mock = new MockAdapter(apiClient);

const USER = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'mara',
  email: 'mara@example.com',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
};

function renderMobileMenu() {
  return renderWithProvider(
    <MemoryRouter>
      <MobileMenu />
    </MemoryRouter>,
  );
}

describe('MobileMenu', () => {
  afterEach(() => {
    mock.reset();
    document.cookie = 'dm_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('opens a slideout with sign-in actions and the primary links', async () => {
    const user = userEvent.setup();
    renderMobileMenu();

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(
      await screen.findByRole('link', { name: 'Log in' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Monsters' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Spells' })).toBeInTheDocument();
  });

  it('shows account actions when authenticated', async () => {
    const user = userEvent.setup();
    document.cookie = 'dm_csrf=token';
    mock.onGet('/v1/auth/me').reply(200, USER);
    renderMobileMenu();

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(
      await screen.findByRole('link', { name: 'Account' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Log in' }),
    ).not.toBeInTheDocument();
  });
});
