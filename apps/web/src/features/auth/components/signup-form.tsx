import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Form, FormTextField } from '@/components/ui/form';
import { Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { H1, Text } from '@/components/ui/typography';
import { paths } from '@/config/paths';
import { useSignup } from '@/lib/auth';

import { authErrorMessage, signupFieldForError } from '../error-mapping';
import { signupSchema } from '../schemas';

export function SignupForm() {
  const navigate = useNavigate();
  const signupMutation = useSignup();
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <Column gap="4">
      <H1>Create your account</H1>
      {formError !== null && (
        <Callout.Root color="red" role="alert">
          <Callout.Text>{formError}</Callout.Text>
        </Callout.Root>
      )}
      <Form
        schema={signupSchema}
        onSubmit={(values, methods) => {
          setFormError(null);
          signupMutation.mutate(
            {
              username: values.username,
              email: values.email,
              password: values.password,
            },
            {
              onSuccess: () => {
                void navigate(paths.account.getHref(), { replace: true });
              },
              onError: (error) => {
                const field = signupFieldForError(error);
                if (field !== null) {
                  methods.setError(field, { message: authErrorMessage(error) });
                } else {
                  setFormError(authErrorMessage(error));
                }
              },
            },
          );
        }}
      >
        {() => (
          <Column gap="3">
            <FormTextField
              name="username"
              label="Username"
              autoComplete="username"
              helpText="Lowercase letters, numbers, hyphen, and underscore. 3-30 characters."
            />
            <FormTextField
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
            />
            <FormTextField
              name="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              helpText="At least 8 characters."
            />
            <FormTextField
              name="confirmPassword"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
            />
            <Button type="submit" loading={signupMutation.isPending}>
              Create account
            </Button>
          </Column>
        )}
      </Form>
      <Text size="2">
        Already have an account?{' '}
        <RouterLink to={paths.login.getHref()}>Log in</RouterLink>
      </Text>
    </Column>
  );
}
