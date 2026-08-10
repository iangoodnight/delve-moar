import { EnvelopeIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import { FormTextField } from '@/components/ui/form';
import { FormDialog } from '@/components/ui/form-dialog';
import { getApiErrorMessage } from '@/lib/api-client';
import { useChangeEmail } from '@/lib/auth';
import { notify } from '@/lib/notifications';

import { changeEmailFieldForError } from '../error-mapping';
import { changeEmailSchema } from '../schemas';

interface ChangeEmailDialogProps {
  // the trigger element (an icon button)
  readonly children: ReactNode;
}

export function ChangeEmailDialog({
  children,
}: Readonly<ChangeEmailDialogProps>) {
  const changeEmail = useChangeEmail();

  return (
    <FormDialog
      description="Enter a new address. We email it a confirmation link; your email changes only after you open it."
      onSubmit={(values, methods, close) => {
        changeEmail.mutate(
          {
            newEmail: values.newEmail,
            currentPassword: values.currentPassword,
          },
          {
            onSuccess: () => {
              close();
              notify.success(
                `Confirmation link sent to ${values.newEmail}. Check that inbox to finish the change.`,
              );
            },
            onError: (error) => {
              // Taken/unchanged -> newEmail, wrong password ->
              // currentPassword; anything else toasts.
              const field = changeEmailFieldForError(error);
              if (field !== null) {
                methods.setError(field, {
                  message: getApiErrorMessage(error),
                });
              }
            },
          },
        );
      }}
      schema={changeEmailSchema}
      submitIcon={<EnvelopeIcon aria-hidden="true" weight="bold" />}
      submitLabel="Send confirmation link"
      submitting={changeEmail.isPending}
      title="Change email"
      trigger={children}
    >
      {() => (
        <>
          <FormTextField
            autoComplete="email"
            helpText="We send a confirmation link to this address."
            label="New email"
            name="newEmail"
            type="email"
          />
          <FormTextField
            autoComplete="current-password"
            helpText="We ask for your current password to confirm it's you."
            label="Current password"
            name="currentPassword"
            type="password"
          />
        </>
      )}
    </FormDialog>
  );
}
