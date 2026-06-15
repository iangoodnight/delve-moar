import { Head } from '@/components/seo/head';
import { SignupForm } from '@/features/auth';

export default function Signup() {
  return (
    <>
      <Head description="Create a DelveMoar account." title="Sign up" />
      <SignupForm />
    </>
  );
}
