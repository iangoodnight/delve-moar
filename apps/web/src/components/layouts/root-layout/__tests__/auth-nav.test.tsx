import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { apiClient } from '@/lib/api-client';
import { renderWithProvider } from '@/testing/setup';

import { AuthNav } from '../auth-nav';

const mock = new MockAdapter(apiClient);

const USER = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'mara',
  email: 'mara@example.com',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
};

function renderAuthNav() {
  return renderWithProvider(
    <MemoryRouter>
      <AuthNav />
    </MemoryRouter>,
  );
}

describe('AuthNav', () => {
  afterEach(() => {
    mock.reset();
    document.cookie = 'dm_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('shows log in and sign up links when anonymous', () => {
    renderAuthNav();
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Log out' }),
    ).not.toBeInTheDocument();
  });

  it('shows the username and a log out action when authenticated', async () => {
    document.cookie = 'dm_csrf=token';
    mock.onGet('/v1/auth/me').reply(200, USER);
    renderAuthNav();

    expect(
      await screen.findByRole('link', { name: 'mara' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Log in' }),
    ).not.toBeInTheDocument();
  });

  it('logs out when the log out button is clicked', async () => {
    const user = userEvent.setup();
    document.cookie = 'dm_csrf=token';
    mock.onGet('/v1/auth/me').reply(200, USER);
    mock.onPost('/v1/auth/logout').reply(204);
    renderAuthNav();

    await screen.findByRole('button', { name: 'Log out' });
    await user.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => {
      expect(
        mock.history.post.some((req) => req.url === '/v1/auth/logout'),
      ).toBe(true);
    });
  });
});
