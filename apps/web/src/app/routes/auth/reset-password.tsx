import { Head } from '@/components/seo/head';
import { ResetPasswordForm } from '@/features/auth';

export default function ResetPassword() {
  return (
    <>
      <Head title="Reset password" description="Set a new password." />
      <ResetPasswordForm />
    </>
  );
}
