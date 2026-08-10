import { Head } from '@/components/seo/head';
import { EmailChangeConfirmPanel } from '@/features/auth';

export default function ConfirmEmailChange() {
  return (
    <>
      <Head
        description="Confirm your new DelveMoar email address."
        title="Confirm email change"
      />
      <EmailChangeConfirmPanel />
    </>
  );
}
