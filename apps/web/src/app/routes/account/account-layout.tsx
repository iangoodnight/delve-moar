import { Outlet } from 'react-router-dom';

import { AccountLayout } from '@/components/layouts/account-layout';
import { ProtectedRoute } from '@/lib/auth';

// Protected shell for every /account route; the side nav and width live here.
export default function AccountLayoutRoute() {
  return (
    <ProtectedRoute>
      <AccountLayout>
        <Outlet />
      </AccountLayout>
    </ProtectedRoute>
  );
}
