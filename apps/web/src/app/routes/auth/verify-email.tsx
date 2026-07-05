import { Head } from '@/components/seo/head';
import { VerifyEmailPanel } from '@/features/auth';

export default function VerifyEmail() {
  return (
    <>
      <Head description="Confirm your email address." title="Verify email" />
      <VerifyEmailPanel />
    </>
  );
}
