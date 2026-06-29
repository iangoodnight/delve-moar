import { PaperPlaneTiltIcon, SignOutIcon } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button, FormButton } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { DataList } from '@/components/ui/data-list';
import { Column, Row } from '@/components/ui/layout';
import { InfoPopover } from '@/components/ui/popover';
import { Tooltip } from '@/components/ui/tooltip';
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
      <DataList.Root orientation={{ initial: 'vertical', xs: 'horizontal' }}>
        <DataList.Item>
          <DataList.Label>Username</DataList.Label>
          <DataList.Value>{user.username}</DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>Email</DataList.Label>
          <DataList.Value>
            <Row gap="4" gapY="2" wrap="wrap">
              <Row maxWidth={{ initial: '24rem', xs: '26.4rem' }} minWidth="0">
                <Tooltip content={user.email}>
                  <Text truncate>{user.email}</Text>
                </Tooltip>
              </Row>
              <Row gap="2">
                {user.emailVerified ? (
                  <Badge color="green">Verified</Badge>
                ) : (
                  <Badge color="amber">Unverified</Badge>
                )}
                <InfoPopover maxWidth={{ initial: '24rem', xs: '52rem' }}>
                  <Text>
                    Your email address is used for account recovery and
                    receiving important notifications. Please verify it to
                    ensure you can regain access if you forget your password.
                  </Text>
                </InfoPopover>
              </Row>
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
          <Column align="start" gap="2">
            <Text size="2">Your email is not verified.</Text>
            <Row justify="center" width="100%">
              <Button
                loading={resendVerification.isPending}
                onClick={() => {
                  resendVerification.mutate();
                }}
              >
                <PaperPlaneTiltIcon aria-hidden="true" weight="bold" />
                Resend verification email
              </Button>
            </Row>
          </Column>
        ))}

      <FormButton
        icon={<SignOutIcon aria-hidden="true" weight="bold" />}
        loading={logout.isPending}
        mt="3"
        onClick={() => {
          logout.mutate(undefined, {
            onSuccess: () => {
              void navigate(paths.home.getHref(), { replace: true });
            },
          });
        }}
        type="button"
        variant="soft"
      >
        Log out
      </FormButton>
    </Column>
  );
}
