import { Head } from '@/components/seo/head';
import { LoginForm } from '@/features/auth';

export default function Login() {
  return (
    <>
      <Head description="Sign in to your DelveMoar account." title="Log in" />
      <LoginForm />
    </>
  );
}
