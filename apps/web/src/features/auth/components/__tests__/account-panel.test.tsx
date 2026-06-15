import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { apiClient } from '@/lib/api-client';
import { renderWithProvider } from '@/testing/setup';

import { AccountPanel } from '../account-panel';

const mock = new MockAdapter(apiClient);

function makeUser(emailVerified: boolean) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'mara',
    email: 'mara@example.com',
    emailVerified,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

function renderAccountPanel(emailVerified = true) {
  document.cookie = 'dm_csrf=token';
  mock.onGet('/v1/auth/me').reply(200, makeUser(emailVerified));
  return renderWithProvider(
    <MemoryRouter>
      <AccountPanel />
    </MemoryRouter>,
  );
}

describe('AccountPanel', () => {
  afterEach(() => {
    mock.reset();
    document.cookie = 'dm_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('shows the username and a verified email badge', async () => {
    renderAccountPanel(true);

    expect(await screen.findByText('mara')).toBeInTheDocument();
    expect(screen.getByText('mara@example.com')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /resend/i }),
    ).not.toBeInTheDocument();
  });

  it('offers resend for an unverified email and confirms after sending', async () => {
    const user = userEvent.setup();
    mock.onPost('/v1/auth/resend-verification').reply(204);
    renderAccountPanel(false);

    expect(await screen.findByText('Unverified')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Resend verification email' }),
    );

    expect(
      await screen.findByText(/verification email sent/i),
    ).toBeInTheDocument();
  });

  it('logs out when the log out button is clicked', async () => {
    const user = userEvent.setup();
    mock.onPost('/v1/auth/logout').reply(204);
    renderAccountPanel(true);

    await screen.findByText('mara');
    await user.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => {
      expect(
        mock.history.post.some((req) => req.url === '/v1/auth/logout'),
      ).toBe(true);
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderAccountPanel(true);
    await screen.findByText('mara');
    expect(await axe(container)).toHaveNoViolations();
  });
});
