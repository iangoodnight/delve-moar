import { Outlet } from 'react-router-dom';

import { AuthCard } from '@/features/auth';

// Routes the auth pages through the shared, width-constrained auth card.
export default function AuthLayout() {
  return (
    <AuthCard>
      <Outlet />
    </AuthCard>
  );
}
