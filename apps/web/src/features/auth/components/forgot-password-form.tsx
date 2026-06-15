import { PaperPlaneTiltIcon } from '@phosphor-icons/react';

import { FormButton } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Form, FormTextField } from '@/components/ui/form';
import { Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { H1, Text } from '@/components/ui/typography';
import { paths } from '@/config/paths';
import { useRequestPasswordReset } from '@/lib/auth';

import { forgotPasswordSchema } from '../schemas';

export function ForgotPasswordForm() {
  const requestReset = useRequestPasswordReset();

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
      <H1>Reset password</H1>
      <Text size="2">
        Enter your username or email and we will send a reset link.
      </Text>
      <Form
        onSubmit={(values) => {
          requestReset.mutate(values);
        }}
        schema={forgotPasswordSchema}
      >
        {() => (
          <Column gap="3">
            <FormTextField
              autoComplete="username"
              helpText="A verified email is required to receive a reset link."
              label="Username or email"
              name="identifier"
            />
            <FormButton
              icon={<PaperPlaneTiltIcon aria-hidden="true" weight="bold" />}
              loading={requestReset.isPending}
            >
              Send reset link
            </FormButton>
          </Column>
        )}
      </Form>
      <Text size="2">
        <RouterLink to={paths.login.getHref()}>Back to log in</RouterLink>
      </Text>
    </Column>
  );
}
