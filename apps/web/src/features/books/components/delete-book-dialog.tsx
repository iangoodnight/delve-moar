import { TrashIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { AlertDialog } from '@/components/ui/dialog';
import { Row } from '@/components/ui/layout';
import { Tooltip } from '@/components/ui/tooltip';
import { Text } from '@/components/ui/typography';
import { notify } from '@/lib/notifications';

import { useDeleteBook } from '../api/delete-book';

interface DeleteBookDialogProps {
  readonly bookId: string;
  readonly bookName: string;
  readonly children: ReactNode;
  // wraps the trigger so an icon-only button gets a hover/focus label
  readonly tooltip?: string;
}

export function DeleteBookDialog({
  bookId,
  bookName,
  children,
  tooltip,
}: Readonly<DeleteBookDialogProps>) {
  const [open, setOpen] = useState(false);
  const deleteBook = useDeleteBook();

  return (
    <AlertDialog.Root onOpenChange={setOpen} open={open}>
      {tooltip === undefined ? (
        <AlertDialog.Trigger>{children}</AlertDialog.Trigger>
      ) : (
        <Tooltip content={tooltip}>
          <AlertDialog.Trigger>{children}</AlertDialog.Trigger>
        </Tooltip>
      )}
      <AlertDialog.Content maxWidth="32rem">
        <AlertDialog.Title>Delete book</AlertDialog.Title>
        <AlertDialog.Description size="2">
          <Text>
            Delete <Text weight="bold">{bookName}</Text>? Its contents stay in
            your account; only the collection is removed.
          </Text>
        </AlertDialog.Description>
        <Row gap="3" justify="end" mt="4">
          <AlertDialog.Cancel>
            <Button color="gray" variant="soft">
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <Button
            color="red"
            loading={deleteBook.isPending}
            onClick={() => {
              deleteBook.mutate(bookId, {
                onSuccess: () => {
                  setOpen(false);
                  notify.info(
                    `Book "${bookName}" deleted. Its contents remain in your account.`,
                  );
                },
              });
            }}
          >
            <TrashIcon aria-hidden="true" weight="bold" /> Delete book
          </Button>
        </Row>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
