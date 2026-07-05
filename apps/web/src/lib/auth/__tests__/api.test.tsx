import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { apiClient } from '@/lib/api-client';

import type { User } from '../api';
import {
  useLogin,
  useLogout,
  USER_QUERY_KEY,
  useRequestPasswordReset,
  useResetPassword,
  useSignup,
  useVerifyEmail,
} from '../api';

const mock = new MockAdapter(apiClient);

const USER: User = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'mara',
  email: 'mara@example.com',
  emailVerified: false,
  createdAt: '2026-01-01T00:00:00Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return { queryClient, Wrapper };
}

describe('lib/auth api hooks', () => {
  afterEach(() => {
    mock.reset();
  });

  it('useLogin posts the identifier/password and caches the user', async () => {
    mock.onPost('/v1/auth/login').reply(200, USER);
    const { queryClient, Wrapper } = createWrapper();
    const { result } = renderHook(() => useLogin(), { wrapper: Wrapper });

    result.current.mutate({ identifier: 'mara', password: 'correct horse' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(queryClient.getQueryData(USER_QUERY_KEY)).toEqual(USER);
    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({
      identifier: 'mara',
      password: 'correct horse',
    });
  });

  it('useSignup posts the account and caches the new user', async () => {
    mock.onPost('/v1/auth/signup').reply(201, USER);
    const { queryClient, Wrapper } = createWrapper();
    const { result } = renderHook(() => useSignup(), { wrapper: Wrapper });

    result.current.mutate({
      username: 'mara',
      email: 'mara@example.com',
      password: 'correct horse',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(queryClient.getQueryData(USER_QUERY_KEY)).toEqual(USER);
  });

  it('useLogout posts logout and drops the cached user', async () => {
    mock.onPost('/v1/auth/logout').reply(204);
    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(USER_QUERY_KEY, USER);
    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(queryClient.getQueryData(USER_QUERY_KEY)).toBeNull();
  });

  it('useVerifyEmail posts the token', async () => {
    mock.onPost('/v1/auth/verify-email').reply(204);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useVerifyEmail(), { wrapper: Wrapper });

    result.current.mutate({ token: 'verify-token' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({
      token: 'verify-token',
    });
  });

  it('useRequestPasswordReset posts the identifier and returns the message', async () => {
    mock.onPost('/v1/auth/password-reset').reply(202, {
      message: 'If that account exists, a reset link is on its way.',
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRequestPasswordReset(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ identifier: 'mara@example.com' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.message).toContain('reset link');
  });

  it('useResetPassword posts the token/password and clears the cached user', async () => {
    mock.onPost('/v1/auth/password-reset/confirm').reply(204);
    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(USER_QUERY_KEY, USER);
    const { result } = renderHook(() => useResetPassword(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ token: 'reset-token', password: 'new password' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(queryClient.getQueryData(USER_QUERY_KEY)).toBeNull();
  });
});
