import { EnvelopeIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { FormButton } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Form, FormTextField } from '@/components/ui/form';
import { Column, Row } from '@/components/ui/layout';
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
  const [open, setOpen] = useState(false);
  const changeEmail = useChangeEmail();

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Trigger>{children}</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Change email</Dialog.Title>
        <Dialog.Description size="2">
          Enter a new address. We email it a confirmation link; your email
          changes only after you open it.
        </Dialog.Description>
        <Form
          onSubmit={(values, methods) => {
            changeEmail.mutate(
              {
                newEmail: values.newEmail,
                currentPassword: values.currentPassword,
              },
              {
                onSuccess: () => {
                  setOpen(false);
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
        >
          {() => (
            <Column gap="2" mt="4">
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
              <Row gap="3" justify="end" mt="2" wrap="wrap-reverse">
                <Dialog.Close>
                  <FormButton color="red" type="button" variant="soft">
                    Cancel
                  </FormButton>
                </Dialog.Close>
                <FormButton
                  icon={<EnvelopeIcon aria-hidden="true" weight="bold" />}
                  loading={changeEmail.isPending}
                >
                  Send confirmation link
                </FormButton>
              </Row>
            </Column>
          )}
        </Form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
