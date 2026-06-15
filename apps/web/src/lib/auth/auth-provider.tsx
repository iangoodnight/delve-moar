import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { getCurrentUserQueryOptions } from './api';
import type { AuthContextValue, AuthStatus } from './auth-context';
import { AuthContext } from './auth-context';

interface AuthProviderProps {
  readonly children: ReactNode;
}

export function AuthProvider({ children }: Readonly<AuthProviderProps>) {
  const query = useQuery(getCurrentUserQueryOptions());

  // The cached /me result is the single source of truth, kept current by the
  // auth mutations (login seeds it, logout/reset clear it, verify invalidates
  // it). Deriving from the cache -- not a render-time cookie read -- is what
  // makes the header and route guards react to sign in/out without a refresh.
  let status: AuthStatus;
  if (query.data != null) {
    status = 'authenticated';
  } else if (query.isLoading) {
    status = 'loading';
  } else {
    status = 'anonymous';
  }

  const value: AuthContextValue = {
    user: query.data ?? null,
    status,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}
