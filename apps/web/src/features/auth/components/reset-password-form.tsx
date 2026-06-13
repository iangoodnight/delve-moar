import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Form, FormTextField } from '@/components/ui/form';
import { Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { H1, Text } from '@/components/ui/typography';
import { paths } from '@/config/paths';
import { useResetPassword } from '@/lib/auth';

import { authErrorMessage } from '../error-mapping';
import { resetPasswordSchema } from '../schemas';

export function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const resetPassword = useResetPassword();
  const [formError, setFormError] = useState<string | null>(null);

  if (token === null) {
    return (
      <Column gap="4">
        <H1>Invalid reset link</H1>
        <Callout.Root color="red" role="alert">
          <Callout.Text>
            This password reset link is invalid. Request a new one.
          </Callout.Text>
        </Callout.Root>
        <Text size="2">
          <RouterLink to={paths.forgotPassword.getHref()}>
            Request a reset link
          </RouterLink>
        </Text>
      </Column>
    );
  }

  if (resetPassword.isSuccess) {
    return (
      <Column gap="4">
        <H1>Password reset</H1>
        <Callout.Root color="green" role="status">
          <Callout.Text>
            Your password has been reset. You can now log in.
          </Callout.Text>
        </Callout.Root>
        <Text size="2">
          <RouterLink to={paths.login.getHref()}>Go to log in</RouterLink>
        </Text>
      </Column>
    );
  }

  return (
    <Column gap="4">
      <H1>Choose a new password</H1>
      {formError !== null && (
        <Callout.Root color="red" role="alert">
          <Callout.Text>{formError}</Callout.Text>
        </Callout.Root>
      )}
      <Form
        schema={resetPasswordSchema}
        onSubmit={(values) => {
          setFormError(null);
          resetPassword.mutate(
            { token, password: values.password },
            {
              onError: (error) => {
                setFormError(authErrorMessage(error));
              },
            },
          );
        }}
      >
        {() => (
          <Column gap="3">
            <FormTextField
              name="password"
              label="New password"
              type="password"
              autoComplete="new-password"
              helpText="At least 8 characters."
            />
            <FormTextField
              name="confirmPassword"
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
            />
            <Button type="submit" loading={resetPassword.isPending}>
              Reset password
            </Button>
          </Column>
        )}
      </Form>
    </Column>
  );
}
