import { PlusIcon } from '@phosphor-icons/react';

import { Column } from '@/components/ui/layout';
import { Text } from '@/components/ui/typography';

import styles from './add-book-card.module.css';
import { BookFormDialog } from './book-form-dialog';

export function AddBookCard() {
  return (
    <BookFormDialog>
      <button className={styles['card']} type="button">
        <Column align="center" gap="2">
          <PlusIcon aria-hidden="true" size={24} weight="bold" />
          <Text size="2">New book</Text>
        </Column>
      </button>
    </BookFormDialog>
  );
}
