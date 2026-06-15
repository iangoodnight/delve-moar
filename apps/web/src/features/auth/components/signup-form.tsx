import { UserCirclePlusIcon } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

import { FormButton } from '@/components/ui/button';
import { Form, FormTextField } from '@/components/ui/form';
import { Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { H1, Text } from '@/components/ui/typography';
import { paths } from '@/config/paths';
import { getApiErrorMessage } from '@/lib/api-client';
import { useSignup } from '@/lib/auth';

import { signupFieldForError } from '../error-mapping';
import { signupSchema } from '../schemas';

export function SignupForm() {
  const navigate = useNavigate();
  const signupMutation = useSignup();

  return (
    <Column gap="4">
      <H1>Create account</H1>
      <Text size="2">
        Creating an account lets you build and access custom content and
        campaigns, save your progress, and more. It's free and only takes a
        minute. We will not share your email or send you spam.
      </Text>
      <Form
        onSubmit={(values, methods) => {
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
                // Taken username/email show inline at the field (and are
                // skipped by the global toast); anything else toasts.
                const field = signupFieldForError(error);
                if (field !== null) {
                  methods.setError(field, {
                    message: getApiErrorMessage(error),
                  });
                }
              },
            },
          );
        }}
        schema={signupSchema}
      >
        {() => (
          <Column gap="3">
            <FormTextField
              autoComplete="username"
              helpText="Lowercase letters, numbers, hyphen, and underscore. 3-30 characters."
              label="Username"
              name="username"
            />
            <FormTextField
              autoComplete="email"
              helpText="Used for password recovery and notifications."
              label="Email"
              name="email"
              type="email"
            />
            <FormTextField
              autoComplete="new-password"
              helpText="At least 8 characters."
              label="Password"
              name="password"
              type="password"
            />
            <FormTextField
              autoComplete="new-password"
              helpText="Retype your password to confirm it matches."
              label="Confirm password"
              name="confirmPassword"
              type="password"
            />
            <FormButton
              icon={<UserCirclePlusIcon aria-hidden="true" weight="bold" />}
              loading={signupMutation.isPending}
              mt="2"
            >
              Create account
            </FormButton>
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
