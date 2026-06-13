import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Callout } from '@/components/ui/callout';
import { Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { H1, Text } from '@/components/ui/typography';
import { paths } from '@/config/paths';
import { useVerifyEmail } from '@/lib/auth';

export function VerifyEmailPanel() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const verifyEmail = useVerifyEmail();
  const { mutate } = verifyEmail;
  // The token is single-use; the ref guards against StrictMode's double effect
  // invocation firing two requests (the second would 400 on a consumed token).
  const hasSubmitted = useRef(false);

  useEffect(() => {
    if (hasSubmitted.current || token === null) {
      return;
    }
    hasSubmitted.current = true;
    mutate({ token });
  }, [token, mutate]);

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
      {!verifyEmail.isSuccess && !verifyEmail.isError && (
        <Text>Verifying your email...</Text>
      )}
      {verifyEmail.isSuccess && (
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
      {verifyEmail.isError && (
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
