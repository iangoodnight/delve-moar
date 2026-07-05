import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';

import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Column, Row } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { Text } from '@/components/ui/typography';
import { paths } from '@/config/paths';

import type { BookSummary } from '../api/get-books';

import styles from './book-card.module.css';
import { BookFormDialog } from './book-form-dialog';
import { DeleteBookDialog } from './delete-book-dialog';

const UPDATED_FORMAT = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

interface BookCardProps {
  readonly book: BookSummary;
}

export function BookCard({ book }: Readonly<BookCardProps>) {
  const deleteLabel = `Delete ${book.name}`;
  const editLabel = `Edit ${book.name}`;

  return (
    <Card className={styles['card']} size="3">
      <Column gap="2" height="100%">
        <Row align="start" gap="2" justify="between">
          <RouterLink
            className={styles['name-link']}
            size="4"
            to={paths.accountBookDetail.getHref(book.id)}
            weight="medium"
          >
            {book.name}
          </RouterLink>
          <Row flexShrink="0" gap="3">
            <BookFormDialog book={book} tooltip={editLabel}>
              <IconButton aria-label={editLabel} radius="large" variant="ghost">
                <PencilSimpleIcon aria-hidden="true" />
              </IconButton>
            </BookFormDialog>
            <DeleteBookDialog
              bookId={book.id}
              bookName={book.name}
              tooltip={deleteLabel}
            >
              <IconButton
                aria-label={deleteLabel}
                color="red"
                radius="large"
                variant="ghost"
              >
                <TrashIcon aria-hidden="true" />
              </IconButton>
            </DeleteBookDialog>
          </Row>
        </Row>

        {book.description !== null && book.description !== '' && (
          <Text className={styles['description']} color="gray" size="2">
            {book.description}
          </Text>
        )}

        <Row mt="auto" pt="2">
          <Text color="gray" size="1">
            Updated {UPDATED_FORMAT.format(new Date(book.updatedAt))}
          </Text>
        </Row>
      </Column>
    </Card>
  );
}
