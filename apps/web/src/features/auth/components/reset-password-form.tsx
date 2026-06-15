import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Form, FormTextField } from '@/components/ui/form';
import { Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { H1, Text } from '@/components/ui/typography';
import { paths } from '@/config/paths';
import { useResetPassword } from '@/lib/auth';

import { resetPasswordSchema } from '../schemas';

export function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const resetPassword = useResetPassword();

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
      <Form
        onSubmit={(values) => {
          // An invalid/expired token surfaces via the global toast.
          resetPassword.mutate({ token, password: values.password });
        }}
        schema={resetPasswordSchema}
      >
        {() => (
          <Column gap="3">
            <FormTextField
              autoComplete="new-password"
              helpText="At least 8 characters."
              label="New password"
              name="password"
              type="password"
            />
            <FormTextField
              autoComplete="new-password"
              label="Confirm new password"
              name="confirmPassword"
              type="password"
            />
            <Button loading={resetPassword.isPending} type="submit">
              Reset password
            </Button>
          </Column>
        )}
      </Form>
    </Column>
  );
}
