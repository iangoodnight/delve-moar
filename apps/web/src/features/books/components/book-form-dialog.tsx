import { BookIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { Button, FormButton } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Form, FormTextArea, FormTextField } from '@/components/ui/form';
import { Column, Row } from '@/components/ui/layout';
import { Tooltip } from '@/components/ui/tooltip';
import { notify } from '@/lib/notifications';

import { useCreateBook } from '../api/create-book';
import type { Book } from '../api/get-book';
import type { BookSummary } from '../api/get-books';
import { useUpdateBook } from '../api/update-book';
import type { BookFormValues } from '../schemas';
import { bookFormSchema } from '../schemas';

interface EditFieldSeedProps {
  readonly book: BookSummary | Book;
  readonly methods: UseFormReturn<BookFormValues, unknown, BookFormValues>;
}
// seeds the fields from an existing book on open
function EditFieldSeed({ book, methods }: Readonly<EditFieldSeedProps>) {
  useEffect(() => {
    methods.reset({ name: book.name, description: book.description ?? '' });
  }, [book, methods]);
  return null;
}

interface BookFormDialogProps {
  // present -> edit that book; absent -> create a new one
  readonly book?: BookSummary | Book;
  readonly children: ReactNode;
  // wraps the trigger so an icon-only button gets a hover/focus label
  readonly tooltip?: string;
}

export function BookFormDialog({
  book,
  children,
  tooltip,
}: Readonly<BookFormDialogProps>) {
  const [open, setOpen] = useState(false);
  const createBook = useCreateBook();
  const updateBook = useUpdateBook();
  const isEdit = book !== undefined;
  const pending = createBook.isPending || updateBook.isPending;

  const submit = (values: BookFormValues) => {
    const description = values.description === '' ? null : values.description;
    if (isEdit) {
      updateBook.mutate(
        { bookId: book.id, data: { name: values.name, description } },
        {
          onSuccess: () => {
            setOpen(false);
            notify.success(`Book "${values.name}" updated!`);
          },
        },
      );
      return;
    }
    createBook.mutate(
      { name: values.name, description },
      {
        onSuccess: () => {
          setOpen(false);
          notify.success(
            `Book "${values.name}" created! You can add monsters, spells, and items to it now.`,
          );
        },
      },
    );
  };

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      {tooltip === undefined ? (
        <Dialog.Trigger>{children}</Dialog.Trigger>
      ) : (
        <Tooltip content={tooltip}>
          <Dialog.Trigger>{children}</Dialog.Trigger>
        </Tooltip>
      )}
      <Dialog.Content>
        <Dialog.Title>{isEdit ? 'Edit book' : 'New book'}</Dialog.Title>
        <Dialog.Description size="2">
          {isEdit
            ? 'Rename this book or update its description.'
            : 'Name your collection. You can add content to it later.'}
        </Dialog.Description>
        <Form onSubmit={submit} schema={bookFormSchema}>
          {(methods) => (
            <Column gap="3" mt="4">
              {isEdit && <EditFieldSeed book={book} methods={methods} />}
              <FormTextField
                helpText="This is the name of your book. You can change it later."
                label="Name"
                name="name"
                placeholder="Monstrous Books of Monsters"
              />
              <FormTextArea
                helpText="This is an optional description for your book. You can change it later."
                label="Description"
                name="description"
                placeholder="Behold and tremble at the monstrous contents of this book!"
                resize="vertical"
              />
              <Row gap="3" justify="end" mt="2">
                <Dialog.Close>
                  <Button color="red" size="3" type="button" variant="soft">
                    Cancel
                  </Button>
                </Dialog.Close>
                <FormButton
                  icon={<BookIcon aria-hidden="true" weight="bold" />}
                  loading={pending}
                >
                  {isEdit ? 'Save' : 'Create book'}
                </FormButton>
              </Row>
            </Column>
          )}
        </Form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
