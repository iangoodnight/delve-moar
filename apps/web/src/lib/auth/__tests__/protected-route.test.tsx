import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { apiClient } from '@/lib/api-client';

import type { User } from '../api';
import { AuthProvider } from '../auth-provider';
import { ProtectedRoute } from '../protected-route';

const mock = new MockAdapter(apiClient);

const USER: User = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'mara',
  email: 'mara@example.com',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
};

function renderAccountRoute() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/account']}>
          <Routes>
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <div>account secret</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>login page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('ProtectedRoute', () => {
  afterEach(() => {
    mock.reset();
    document.cookie = 'dm_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('redirects an anonymous user to the login page', () => {
    renderAccountRoute();

    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('account secret')).not.toBeInTheDocument();
  });

  it('renders the protected content for an authenticated user', async () => {
    document.cookie = 'dm_csrf=token';
    mock.onGet('/v1/auth/me').reply(200, USER);

    renderAccountRoute();

    await waitFor(() => {
      expect(screen.getByText('account secret')).toBeInTheDocument();
    });
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });
});
