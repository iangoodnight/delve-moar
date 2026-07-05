import { Head } from '@/components/seo/head';
import { ForgotPasswordForm } from '@/features/auth';

export default function ForgotPassword() {
  return (
    <>
      <Head
        description="Request a password reset link."
        title="Forgot password"
      />
      <ForgotPasswordForm />
    </>
  );
}
