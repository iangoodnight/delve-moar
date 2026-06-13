import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { paths } from '@/config/paths';

import { useAuth } from './auth-context';

interface ProtectedRouteProps {
  readonly children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    // Brief: only while /me is in flight on a returning visit.
    return null;
  }

  if (status === 'anonymous') {
    // Carry the attempted location so login can send the user back.
    return (
      <Navigate to={paths.login.getHref()} state={{ from: location }} replace />
    );
  }

  return <>{children}</>;
}
