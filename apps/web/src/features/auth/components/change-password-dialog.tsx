import { KeyIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { FormButton } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Form, FormTextField } from '@/components/ui/form';
import { Column, Row } from '@/components/ui/layout';
import { getApiErrorMessage } from '@/lib/api-client';
import { useChangePassword } from '@/lib/auth';
import { notify } from '@/lib/notifications';

import { changePasswordFieldForError } from '../error-mapping';
import { changePasswordSchema } from '../schemas';

interface ChangePasswordDialogProps {
  // the trigger element (a button)
  readonly children: ReactNode;
}

export function ChangePasswordDialog({
  children,
}: Readonly<ChangePasswordDialogProps>) {
  const [open, setOpen] = useState(false);
  const changePassword = useChangePassword();

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Trigger>{children}</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Change password</Dialog.Title>
        <Dialog.Description size="2">
          Choose a new password. This signs you out on your other devices.
        </Dialog.Description>
        <Form
          onSubmit={(values, methods) => {
            changePassword.mutate(
              {
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
              },
              {
                onSuccess: () => {
                  setOpen(false);
                  notify.success('Your password has been changed.');
                },
                onError: (error) => {
                  // A wrong current password shows inline; the rest toast.
                  const field = changePasswordFieldForError(error);
                  if (field !== null) {
                    methods.setError(field, {
                      message: getApiErrorMessage(error),
                    });
                  }
                },
              },
            );
          }}
          schema={changePasswordSchema}
        >
          {() => (
            <Column gap="2" mt="4">
              <FormTextField
                autoComplete="current-password"
                helpText="Enter your current password to confirm."
                label="Current password"
                name="currentPassword"
                type="password"
              />
              <FormTextField
                autoComplete="new-password"
                helpText="At least 8 characters."
                label="New password"
                name="newPassword"
                type="password"
              />
              <FormTextField
                autoComplete="new-password"
                helpText="Re-enter your new password to confirm it."
                label="Confirm new password"
                name="confirmNewPassword"
                type="password"
              />
              <Row gap="3" justify="end" mt="2" wrap="wrap-reverse">
                <Dialog.Close>
                  <FormButton color="red" type="button" variant="soft">
                    Cancel
                  </FormButton>
                </Dialog.Close>
                <FormButton
                  icon={<KeyIcon aria-hidden="true" weight="bold" />}
                  loading={changePassword.isPending}
                >
                  Change password
                </FormButton>
              </Row>
            </Column>
          )}
        </Form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
