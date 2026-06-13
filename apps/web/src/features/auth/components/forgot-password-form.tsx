import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Form, FormTextField } from '@/components/ui/form';
import { Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { H1, Text } from '@/components/ui/typography';
import { paths } from '@/config/paths';
import { useRequestPasswordReset } from '@/lib/auth';

import { authErrorMessage } from '../error-mapping';
import { forgotPasswordSchema } from '../schemas';

export function ForgotPasswordForm() {
  const requestReset = useRequestPasswordReset();
  const [formError, setFormError] = useState<string | null>(null);

  // The API responds identically whether or not the account exists, so the
  // success screen is safe to show for any submitted identifier.
  if (requestReset.isSuccess) {
    return (
      <Column gap="4">
        <H1>Check your email</H1>
        <Callout.Root color="green" role="status">
          <Callout.Text>{requestReset.data.message}</Callout.Text>
        </Callout.Root>
        <Text size="2">
          <RouterLink to={paths.login.getHref()}>Back to log in</RouterLink>
        </Text>
      </Column>
    );
  }

  return (
    <Column gap="4">
      <H1>Reset your password</H1>
      <Text size="2">
        Enter your username or email and we will send a reset link.
      </Text>
      {formError !== null && (
        <Callout.Root color="red" role="alert">
          <Callout.Text>{formError}</Callout.Text>
        </Callout.Root>
      )}
      <Form
        schema={forgotPasswordSchema}
        onSubmit={(values) => {
          setFormError(null);
          requestReset.mutate(values, {
            onError: (error) => {
              setFormError(authErrorMessage(error));
            },
          });
        }}
      >
        {() => (
          <Column gap="3">
            <FormTextField
              name="identifier"
              label="Username or email"
              autoComplete="username"
            />
            <Button type="submit" loading={requestReset.isPending}>
              Send reset link
            </Button>
          </Column>
        )}
      </Form>
      <Text size="2">
        <RouterLink to={paths.login.getHref()}>Back to log in</RouterLink>
      </Text>
    </Column>
  );
}
