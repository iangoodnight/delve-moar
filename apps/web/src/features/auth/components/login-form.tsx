import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Form, FormTextField } from '@/components/ui/form';
import { Column, Row } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { H1, Text } from '@/components/ui/typography';
import { paths } from '@/config/paths';
import { useLogin } from '@/lib/auth';

import { authErrorMessage } from '../error-mapping';
import { loginSchema } from '../schemas';

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLogin();
  const [formError, setFormError] = useState<string | null>(null);

  // ProtectedRoute stashes the attempted path here for return-to.
  const state = location.state as { from?: string } | null;
  const returnTo = state?.from ?? paths.home.getHref();

  return (
    <Column gap="4">
      <H1>Log in</H1>
      {formError !== null && (
        <Callout.Root color="red" role="alert">
          <Callout.Text>{formError}</Callout.Text>
        </Callout.Root>
      )}
      <Form
        schema={loginSchema}
        onSubmit={(values) => {
          setFormError(null);
          loginMutation.mutate(values, {
            onSuccess: () => {
              void navigate(returnTo, { replace: true });
            },
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
            <FormTextField
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
            />
            <Button type="submit" loading={loginMutation.isPending}>
              Log in
            </Button>
          </Column>
        )}
      </Form>
      <Row justify="between" gap="3" wrap="wrap">
        <RouterLink to={paths.forgotPassword.getHref()} size="2">
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
