import { KeyIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import { FormTextField } from '@/components/ui/form';
import { FormDialog } from '@/components/ui/form-dialog';
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
  const changePassword = useChangePassword();

  return (
    <FormDialog
      description="Choose a new password. This signs you out on your other devices."
      onSubmit={(values, methods, close) => {
        changePassword.mutate(
          {
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
          },
          {
            onSuccess: () => {
              close();
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
      submitIcon={<KeyIcon aria-hidden="true" weight="bold" />}
      submitLabel="Change password"
      submitting={changePassword.isPending}
      title="Change password"
      trigger={children}
    >
      {() => (
        <>
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
        </>
      )}
    </FormDialog>
  );
}
