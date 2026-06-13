import { Head } from '@/components/seo/head';
import { SignupForm } from '@/features/auth';

export default function Signup() {
  return (
    <>
      <Head title="Sign up" description="Create a DelveMoar account." />
      <SignupForm />
    </>
  );
}
