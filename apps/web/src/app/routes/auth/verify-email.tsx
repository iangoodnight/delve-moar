import { Head } from '@/components/seo/head';
import { VerifyEmailPanel } from '@/features/auth';

export default function VerifyEmail() {
  return (
    <>
      <Head title="Verify email" description="Confirm your email address." />
      <VerifyEmailPanel />
    </>
  );
}
