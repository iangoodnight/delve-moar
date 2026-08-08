import { DownloadSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { ConfirmDestructive } from '@/components/ui/confirm-destructive';
import { Form, FormTextField } from '@/components/ui/form';
import { Column } from '@/components/ui/layout';
import { paths } from '@/config/paths';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  type AccountExport,
  useDeleteAccount,
  useExportAccount,
} from '@/lib/auth';

import { deleteAccountFieldForError } from '../error-mapping';
import { deleteAccountSchema } from '../schemas';

// Serialize the export to a file the browser downloads. Building the anchor
// in code keeps it CSP-friendly (no inline handlers) and needs no server round
// trip beyond the fetch that produced `data`.
function downloadAccountExport(data: AccountExport): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'delvemoar-account-export.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

// The export and delete controls for the account "Actions" section. Rendered
// inline (no heading) so the account panel can group them with the other
// account actions.
export function AccountDangerZone() {
  const navigate = useNavigate();
  const exportAccount = useExportAccount();
  const deleteAccount = useDeleteAccount();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Button
        loading={exportAccount.isPending}
        onClick={() => {
          exportAccount.mutate(undefined, {
            onSuccess: (data) => {
              downloadAccountExport(data);
            },
          });
        }}
        type="button"
      >
        <DownloadSimpleIcon aria-hidden="true" weight="bold" />
        Export my data
      </Button>

      <ConfirmDestructive
        confirmLoading={deleteAccount.isPending}
        confirmText={
          <>
            <TrashIcon aria-hidden="true" weight="bold" /> Delete account
          </>
        }
        description="This permanently deletes your account and the books you own. Your collections cannot be recovered. Enter your password to confirm."
        formId="delete-account-form"
        maxWidth="45rem"
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        title="Delete your account?"
        trigger={
          <Button color="red" type="button">
            <TrashIcon aria-hidden="true" weight="bold" />
            Delete account
          </Button>
        }
      >
        <Form
          id="delete-account-form"
          onSubmit={(values, methods) => {
            deleteAccount.mutate(
              { password: values.password },
              {
                onSuccess: () => {
                  setConfirmOpen(false);
                  void navigate(paths.home.getHref(), { replace: true });
                },
                onError: (error) => {
                  // A wrong password shows inline; other failures toast.
                  const field = deleteAccountFieldForError(error);
                  if (field !== null) {
                    methods.setError(field, {
                      message: getApiErrorMessage(error),
                    });
                  }
                },
              },
            );
          }}
          schema={deleteAccountSchema}
        >
          {() => (
            <Column gap="3" mt="4">
              <FormTextField
                autoComplete="current-password"
                helpText="Enter your current password to confirm."
                label="Current password"
                name="password"
                type="password"
              />
            </Column>
          )}
        </Form>
      </ConfirmDestructive>
    </>
  );
}
