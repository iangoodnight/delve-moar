import { Head } from '@/components/seo/head';
import { ResetPasswordForm } from '@/features/auth';

export default function ResetPassword() {
  return (
    <>
      <Head description="Set a new password." title="Reset password" />
      <ResetPasswordForm />
    </>
  );
}
