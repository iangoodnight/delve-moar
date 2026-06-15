import { Head } from '@/components/seo/head';
import { AccountPanel } from '@/features/auth';
import { ProtectedRoute } from '@/lib/auth';

export default function Account() {
  return (
    <>
      <Head description="Manage your DelveMoar account." title="Your account" />
      <ProtectedRoute>
        <AccountPanel />
      </ProtectedRoute>
    </>
  );
}
