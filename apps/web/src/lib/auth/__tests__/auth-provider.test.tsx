import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api-client';

import type { User } from '../api';
import { useAuth } from '../auth-context';
import { AuthProvider } from '../auth-provider';

const mock = new MockAdapter(apiClient);

const USER: User = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'mara',
  email: 'mara@example.com',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
};

function Probe() {
  const { status, user } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user">{user?.username ?? 'none'}</span>
    </div>
  );
}

function renderWithAuth(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AuthProvider', () => {
  afterEach(() => {
    mock.reset();
    document.cookie = 'dm_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('is anonymous and fires no /me request without the dm_csrf cookie', () => {
    renderWithAuth(<Probe />);

    expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(mock.history.get).toHaveLength(0);
  });

  it('hydrates the user from /me when the cookie is present', async () => {
    document.cookie = 'dm_csrf=token';
    mock.onGet('/v1/auth/me').reply(200, USER);

    renderWithAuth(<Probe />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('mara');
  });

  it('is anonymous when /me returns 401', async () => {
    document.cookie = 'dm_csrf=token';
    mock.onGet('/v1/auth/me').reply(401, {
      status: 401,
      errorCode: 'UNAUTHENTICATED',
      developerMessage: 'No active session.',
      userMessage: 'Please sign in.',
      moreInfo: '',
    });

    renderWithAuth(<Probe />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('throws when useAuth is used outside an AuthProvider', () => {
    // The failed render logs the expected error; silence it for clean output.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow(/AuthProvider/);
    spy.mockRestore();
  });
});
