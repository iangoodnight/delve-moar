import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { getCurrentUserQueryOptions } from './api';
import type { AuthContextValue, AuthStatus } from './auth-context';
import { AuthContext } from './auth-context';

// The session cookie is HttpOnly and unreadable, but the API also sets a
// readable dm_csrf cookie alongside it. Its presence is our signal that a
// session may exist, so we only hit /me when it is there: anonymous visitors
// make no request (no spinner, no wasted round-trip), and tests stay
// hermetic unless they opt in by setting the cookie.
function hasSessionCookie(): boolean {
  return document.cookie
    .split('; ')
    .some((cookie) => cookie.startsWith('dm_csrf='));
}

interface AuthProviderProps {
  readonly children: ReactNode;
}

export function AuthProvider({ children }: Readonly<AuthProviderProps>) {
  const enabled = hasSessionCookie();
  const query = useQuery({ ...getCurrentUserQueryOptions(), enabled });

  let status: AuthStatus;
  if (!enabled) {
    status = 'anonymous';
  } else if (query.isLoading) {
    status = 'loading';
  } else if (query.data !== undefined) {
    status = 'authenticated';
  } else {
    // Enabled but no data: a 401 (or other error) means not signed in.
    status = 'anonymous';
  }

  const value: AuthContextValue = {
    user: query.data ?? null,
    status,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}
