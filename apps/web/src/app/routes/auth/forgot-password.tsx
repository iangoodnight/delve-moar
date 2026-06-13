import { Head } from '@/components/seo/head';
import { ForgotPasswordForm } from '@/features/auth';

export default function ForgotPassword() {
  return (
    <>
      <Head
        title="Forgot password"
        description="Request a password reset link."
      />
      <ForgotPasswordForm />
    </>
  );
}
