import { Head } from '@/components/seo/head';
import { AccountPanel } from '@/features/auth';
import { ProtectedRoute } from '@/lib/auth';

export default function Account() {
  return (
    <>
      <Head title="Your account" description="Manage your DelveMoar account." />
      <ProtectedRoute>
        <AccountPanel />
      </ProtectedRoute>
    </>
  );
}
