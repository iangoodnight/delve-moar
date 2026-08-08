import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Callout } from '@/components/ui/callout';
import { Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { H1, Text } from '@/components/ui/typography';
import { paths } from '@/config/paths';
import { useConfirmEmailChange } from '@/lib/auth';

type ConfirmPhase = 'confirming' | 'confirmed' | 'invalid';

export function EmailChangeConfirmPanel() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { mutateAsync } = useConfirmEmailChange();
  // The token is single-use; the ref guards against StrictMode's double effect
  // invocation firing two requests (the second would 400 on a consumed token).
  const hasSubmitted = useRef(false);
  const [phase, setPhase] = useState<ConfirmPhase>('confirming');

  useEffect(() => {
    if (hasSubmitted.current || token === null) {
      return;
    }
    hasSubmitted.current = true;
    // Drive the panel from the promise + local state rather than the mutation
    // observer, which StrictMode's mount/unmount/remount can leave stuck on
    // "pending" (mirrors VerifyEmailPanel).
    void mutateAsync({ token }).then(
      () => {
        setPhase('confirmed');
      },
      () => {
        setPhase('invalid');
      },
    );
  }, [token, mutateAsync]);

  if (token === null) {
    return (
      <Column gap="4">
        <H1>Invalid confirmation link</H1>
        <Callout.Root color="red" role="alert">
          <Callout.Text>This email-change link is invalid.</Callout.Text>
        </Callout.Root>
        <Text size="2">
          <RouterLink to={paths.account.getHref()}>Back to account</RouterLink>
        </Text>
      </Column>
    );
  }

  return (
    <Column gap="4">
      <H1>Email change</H1>
      {phase === 'confirming' && <Text>Confirming your new email...</Text>}
      {phase === 'confirmed' && (
        <>
          <Callout.Root color="green" role="status">
            <Callout.Text>Your email address has been updated.</Callout.Text>
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
              This link is invalid or has expired, or the address is no longer
              available.
            </Callout.Text>
          </Callout.Root>
          <Text size="2">
            <RouterLink to={paths.account.getHref()}>
              Back to account
            </RouterLink>
          </Text>
        </>
      )}
    </Column>
  );
}
