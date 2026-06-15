import { SignInIcon } from '@phosphor-icons/react';
import { useLocation, useNavigate } from 'react-router-dom';

import { FormButton } from '@/components/ui/button';
import { Form, FormTextField } from '@/components/ui/form';
import { Column, Row } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { H1, Text } from '@/components/ui/typography';
import { paths } from '@/config/paths';
import { useLogin } from '@/lib/auth';

import { loginSchema } from '../schemas';

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLogin();

  // ProtectedRoute stashes the attempted path here for return-to.
  const state = location.state as { from?: string } | null;
  const returnTo = state?.from ?? paths.home.getHref();

  return (
    <Column gap="4">
      <H1 mb="3">Log in</H1>
      <Form
        onSubmit={(values) => {
          // Errors (invalid credentials, network) surface via the global toast.
          loginMutation.mutate(values, {
            onSuccess: () => {
              void navigate(returnTo, { replace: true });
            },
          });
        }}
        schema={loginSchema}
      >
        {() => (
          <Column gap="3">
            <FormTextField
              autoComplete="username"
              label="Username or email"
              name="identifier"
            />
            <FormTextField
              autoComplete="current-password"
              label="Password"
              name="password"
              type="password"
            />
            <FormButton
              icon={<SignInIcon aria-hidden="true" weight="bold" />}
              loading={loginMutation.isPending}
            >
              Log in
            </FormButton>
          </Column>
        )}
      </Form>
      <Row gap="3" justify="between" wrap="wrap">
        <RouterLink size="2" to={paths.forgotPassword.getHref()}>
          Forgot password?
        </RouterLink>
        <Text size="2">
          Need an account?{' '}
          <RouterLink to={paths.signup.getHref()}>Sign up</RouterLink>
        </Text>
      </Row>
    </Column>
  );
}
