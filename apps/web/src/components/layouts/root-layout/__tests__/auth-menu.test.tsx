import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { apiClient } from '@/lib/api-client';
import { renderWithProvider } from '@/testing/setup';

import { AuthMenu } from '../auth-menu';

const mock = new MockAdapter(apiClient);

const USER = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'mara',
  email: 'mara@example.com',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
};

function renderAuthMenu() {
  return renderWithProvider(
    <MemoryRouter>
      <AuthMenu />
    </MemoryRouter>,
  );
}

describe('AuthMenu', () => {
  afterEach(() => {
    mock.reset();
    document.cookie = 'dm_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('opens sign-in options when anonymous', async () => {
    const user = userEvent.setup();
    renderAuthMenu();

    await user.click(screen.getByRole('button', { name: 'Account menu' }));

    expect(
      await screen.findByRole('menuitem', { name: 'Log in' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Sign up' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: 'Log out' }),
    ).not.toBeInTheDocument();
  });

  it('shows account actions when authenticated', async () => {
    const user = userEvent.setup();
    document.cookie = 'dm_csrf=token';
    mock.onGet('/v1/auth/me').reply(200, USER);
    renderAuthMenu();

    await user.click(
      await screen.findByRole('button', { name: /signed in as mara/i }),
    );

    expect(
      await screen.findByRole('menuitem', { name: 'Account' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Log out' }),
    ).toBeInTheDocument();
  });

  it('logs out from the menu', async () => {
    const user = userEvent.setup();
    document.cookie = 'dm_csrf=token';
    mock.onGet('/v1/auth/me').reply(200, USER);
    mock.onPost('/v1/auth/logout').reply(204);
    renderAuthMenu();

    await user.click(
      await screen.findByRole('button', { name: /signed in as mara/i }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Log out' }));

    await waitFor(() => {
      expect(
        mock.history.post.some((req) => req.url === '/v1/auth/logout'),
      ).toBe(true);
    });

    // The trigger flips back to the anonymous label without a /me refetch.
    expect(
      await screen.findByRole('button', { name: 'Account menu' }),
    ).toBeInTheDocument();
  });
});
