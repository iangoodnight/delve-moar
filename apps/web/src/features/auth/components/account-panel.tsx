import {
  KeyIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
} from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button, IconButton } from '@/components/ui/button';
import { DataList } from '@/components/ui/data-list';
import { Column, Row } from '@/components/ui/layout';
import { InfoPopover } from '@/components/ui/popover';
import { Tooltip } from '@/components/ui/tooltip';
import { H1, H2, Text } from '@/components/ui/typography';
import { useAuth, useResendVerification } from '@/lib/auth';
import { notify } from '@/lib/notifications';

import { AccountDangerZone } from './account-danger-zone';
import { ChangeEmailDialog } from './change-email-dialog';
import { ChangePasswordDialog } from './change-password-dialog';

function DataListValue({
  children,
}: {
  readonly children: Readonly<ReactNode>;
}) {
  return (
    <DataList.Value>
      <Column gap="1" minWidth="0">
        {children}
      </Column>
    </DataList.Value>
  );
}

export function AccountPanel() {
  const { user } = useAuth();
  const resendVerification = useResendVerification();

  // ProtectedRoute guarantees a user; this guard just satisfies the type.
  if (user === null) {
    return null;
  }

  // pendingEmail is optional on the wire; normalize an omitted value to null.
  const pendingEmail = user.pendingEmail ?? null;

  return (
    <Column gap="4">
      <H1>My Profile</H1>

      <Column gap="3">
        <DataList.Root orientation={{ initial: 'vertical', xs: 'horizontal' }}>
          <DataList.Item>
            <DataList.Label>Username</DataList.Label>
            <DataListValue>{user.username}</DataListValue>
          </DataList.Item>

          <DataList.Item>
            <DataList.Label>Email</DataList.Label>
            <DataListValue>
              <>
                <Row align="center" gap="3">
                  <Tooltip content={user.email}>
                    <Text truncate>{user.email}</Text>
                  </Tooltip>
                  <ChangeEmailDialog>
                    <IconButton aria-label="Change email" variant="ghost">
                      <PencilSimpleIcon aria-hidden="true" />
                    </IconButton>
                  </ChangeEmailDialog>
                </Row>
                {pendingEmail !== null && (
                  <Text color="amber" size="1">
                    Pending change to {pendingEmail}. Check that inbox to
                    confirm.
                  </Text>
                )}
              </>
            </DataListValue>
          </DataList.Item>

          <DataList.Item>
            <DataList.Label>Verified</DataList.Label>
            <DataListValue>
              <Row align="center" gap="2">
                {user.emailVerified ? (
                  <Badge color="green">Verified</Badge>
                ) : (
                  <Badge color="red">Unverified</Badge>
                )}
                <InfoPopover maxWidth={{ initial: '24rem', xs: '40rem' }}>
                  <Text>
                    {user.emailVerified
                      ? 'Your email address is verified. We use it for account recovery and important notifications.'
                      : 'Your email address is not verified. Verify it so you can recover your account if you forget your password. Use the resend button below.'}
                  </Text>
                </InfoPopover>
              </Row>
            </DataListValue>
          </DataList.Item>
        </DataList.Root>

        {!user.emailVerified && (
          <Row>
            <Button
              loading={resendVerification.isPending}
              onClick={() => {
                resendVerification.mutate(undefined, {
                  onSuccess: () => {
                    notify.success(
                      'Verification email sent. Check your inbox.',
                    );
                  },
                });
              }}
              type="button"
            >
              <PaperPlaneTiltIcon aria-hidden="true" weight="bold" />
              Resend verification email
            </Button>
          </Row>
        )}
      </Column>

      <Column gap="3">
        <H2 size="4">Administration</H2>
        <Row gap="3" wrap="wrap">
          <ChangePasswordDialog>
            <Button>
              <KeyIcon aria-hidden="true" weight="bold" />
              Change password
            </Button>
          </ChangePasswordDialog>
          <AccountDangerZone />
        </Row>
      </Column>
    </Column>
  );
}
