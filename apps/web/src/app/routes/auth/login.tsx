import { Head } from '@/components/seo/head';
import { LoginForm } from '@/features/auth';

export default function Login() {
  return (
    <>
      <Head title="Log in" description="Sign in to your DelveMoar account." />
      <LoginForm />
    </>
  );
}
