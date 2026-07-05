import { createContext, use } from 'react';

import type { User } from './api';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  readonly user: User | null;
  readonly status: AuthStatus;
}

// Kept in its own (component-free) module so the provider file can export
// only its component, satisfying react-refresh/only-export-components.
export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = use(AuthContext);
  if (value === null) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return value;
}

export function useUser(): User | null {
  return useAuth().user;
}
