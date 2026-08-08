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

function makeUser(
  overrides: Partial<{
    emailVerified: boolean;
    pendingEmail: string | null;
  }> = {},
) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'mara',
    email: 'mara@example.com',
    pendingEmail: overrides.pendingEmail ?? null,
    emailVerified: overrides.emailVerified ?? true,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

function renderAccountPanel(user = makeUser()) {
  document.cookie = 'dm_csrf=token';
  mock.onGet('/v1/auth/me').reply(200, user);
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

  it('shows the profile heading, username, email, and verified badge', async () => {
    renderAccountPanel();

    expect(
      await screen.findByRole('heading', { name: 'My Profile', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('mara')).toBeInTheDocument();
    expect(screen.getByText('mara@example.com')).toBeInTheDocument();
    // "Verified" is both the row label and the status badge.
    expect(screen.getAllByText('Verified')).toHaveLength(2);
  });

  it('offers change password and change email controls under Administration', async () => {
    renderAccountPanel();
    await screen.findByText('mara');

    expect(
      screen.getByRole('heading', { name: 'Administration' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Change password' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Change email' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Export my data' }),
    ).toBeInTheDocument();
  });

  it('shows the pending email change when one is outstanding', async () => {
    renderAccountPanel(makeUser({ pendingEmail: 'new@example.com' }));

    expect(
      await screen.findByText(/pending change to new@example\.com/i),
    ).toBeInTheDocument();
  });

  it('shows an Unverified badge and resend button for an unverified email', async () => {
    const user = userEvent.setup();
    mock.onPost('/v1/auth/resend-verification').reply(204);
    renderAccountPanel(makeUser({ emailVerified: false }));

    expect(await screen.findByText('Unverified')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Resend verification email' }),
    );

    await waitFor(() => {
      expect(
        mock.history.post.some(
          (req) => req.url === '/v1/auth/resend-verification',
        ),
      ).toBe(true);
    });
  });

  it('hides resend for a verified email', async () => {
    renderAccountPanel();
    await screen.findByText('mara');

    expect(
      screen.queryByRole('button', { name: /resend/i }),
    ).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderAccountPanel();
    await screen.findByText('mara');

    expect(await axe(container)).toHaveNoViolations();
  });
});
