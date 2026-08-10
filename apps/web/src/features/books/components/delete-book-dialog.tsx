import { TrashIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { ConfirmDestructive } from '@/components/ui/confirm-destructive';
import { Em, Text } from '@/components/ui/typography';
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
    <ConfirmDestructive
      confirmLoading={deleteBook.isPending}
      confirmText={
        <>
          <TrashIcon aria-hidden="true" weight="bold" /> Delete book
        </>
      }
      description={
        <Text>
          Are you sure you want to delete the book <Em>{bookName}</Em>? This
          action cannot be undone. Deleting the book will not delete its
          contents, which will remain in your account.
        </Text>
      }
      onConfirm={() => {
        deleteBook.mutate(bookId, {
          onSuccess: () => {
            setOpen(false);
            notify.info(
              `Book "${bookName}" deleted. Its contents remain in your account.`,
            );
          },
        });
      }}
      onOpenChange={setOpen}
      open={open}
      title="Delete this book?"
      trigger={children}
      {...(tooltip !== undefined && { triggerTooltip: tooltip })}
    />
  );
}
