import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { DataList } from '@/components/ui/data-list';
import { Column, Row } from '@/components/ui/layout';
import { H1, Text } from '@/components/ui/typography';
import { paths } from '@/config/paths';
import { useAuth, useLogout, useResendVerification } from '@/lib/auth';

export function AccountPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const logout = useLogout();
  const resendVerification = useResendVerification();

  // ProtectedRoute guarantees a user; this guard just satisfies the type.
  if (user === null) {
    return null;
  }

  return (
    <Column gap="4">
      <H1>Your account</H1>
      <DataList.Root>
        <DataList.Item>
          <DataList.Label>Username</DataList.Label>
          <DataList.Value>{user.username}</DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>Email</DataList.Label>
          <DataList.Value>
            <Row gap="2">
              {user.email}
              {user.emailVerified ? (
                <Badge color="green">Verified</Badge>
              ) : (
                <Badge color="amber">Unverified</Badge>
              )}
            </Row>
          </DataList.Value>
        </DataList.Item>
      </DataList.Root>

      {!user.emailVerified &&
        (resendVerification.isSuccess ? (
          <Callout.Root color="green" role="status">
            <Callout.Text>
              Verification email sent. Check your inbox.
            </Callout.Text>
          </Callout.Root>
        ) : (
          <Column gap="2" align="start">
            <Text size="2">Your email is not verified.</Text>
            <Button
              variant="soft"
              loading={resendVerification.isPending}
              onClick={() => {
                resendVerification.mutate();
              }}
            >
              Resend verification email
            </Button>
          </Column>
        ))}

      <Button
        color="gray"
        variant="soft"
        loading={logout.isPending}
        onClick={() => {
          logout.mutate(undefined, {
            onSuccess: () => {
              void navigate(paths.home.getHref(), { replace: true });
            },
          });
        }}
      >
        Log out
      </Button>
    </Column>
  );
}
