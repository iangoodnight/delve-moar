import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Callout } from '@/components/ui/callout';
import { Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { H1, Text } from '@/components/ui/typography';
import { paths } from '@/config/paths';
import { useVerifyEmail } from '@/lib/auth';

type VerificationPhase = 'verifying' | 'verified' | 'invalid';

export function VerifyEmailPanel() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { mutateAsync } = useVerifyEmail();
  // The token is single-use; the ref guards against StrictMode's double effect
  // invocation firing two requests (the second would 400 on a consumed token).
  const hasSubmitted = useRef(false);
  const [phase, setPhase] = useState<VerificationPhase>('verifying');

  useEffect(() => {
    if (hasSubmitted.current || token === null) {
      return;
    }
    hasSubmitted.current = true;
    // Drive the panel from the promise + local state rather than the mutation
    // observer: under StrictMode the firing observer gets detached on the
    // mount/unmount/remount and stays stuck on "pending", but the mutateAsync
    // promise still settles, so this stays correct in dev and prod alike.
    void mutateAsync({ token }).then(
      () => {
        setPhase('verified');
      },
      () => {
        setPhase('invalid');
      },
    );
  }, [token, mutateAsync]);

  if (token === null) {
    return (
      <Column gap="4">
        <H1>Invalid verification link</H1>
        <Callout.Root color="red" role="alert">
          <Callout.Text>This verification link is invalid.</Callout.Text>
        </Callout.Root>
        <Text size="2">
          <RouterLink to={paths.login.getHref()}>Back to log in</RouterLink>
        </Text>
      </Column>
    );
  }

  return (
    <Column gap="4">
      <H1>Email verification</H1>
      {phase === 'verifying' && <Text>Verifying your email...</Text>}
      {phase === 'verified' && (
        <>
          <Callout.Root color="green" role="status">
            <Callout.Text>Your email is verified.</Callout.Text>
          </Callout.Root>
          <Text size="2">
            <RouterLink to={paths.account.getHref()}>
              Go to your account
            </RouterLink>
          </Text>
        </>
      )}
      {phase === 'invalid' && (
        <>
          <Callout.Root color="red" role="alert">
            <Callout.Text>
              This verification link is invalid or has expired.
            </Callout.Text>
          </Callout.Root>
          <Text size="2">
            <RouterLink to={paths.login.getHref()}>Back to log in</RouterLink>
          </Text>
        </>
      )}
    </Column>
  );
}
