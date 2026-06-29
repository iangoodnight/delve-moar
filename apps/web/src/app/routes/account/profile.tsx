import { Head } from '@/components/seo/head';
import { AccountPanel } from '@/features/auth';

export default function Profile() {
  return (
    <>
      <Head description="Manage your DelveMoar account." title="Your account" />
      <AccountPanel />
    </>
  );
}
