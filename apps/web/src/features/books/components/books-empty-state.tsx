import { BookOpenIcon, PlusIcon } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Column } from '@/components/ui/layout';
import { Heading, Text } from '@/components/ui/typography';

import { BookFormDialog } from './book-form-dialog';

export function BooksEmptyState() {
  return (
    <Card size="4">
      <Column align="center" gap="3" py="6">
        <BookOpenIcon aria-hidden="true" size={40} weight="thin" />
        <Heading as="h2" size="4">
          No books yet
        </Heading>
        <Text align="center" color="gray" size="2">
          Books are your own collections of monsters, spells, and items. Create
          your first one to start curating.
        </Text>
        <BookFormDialog>
          <Button mt="2" size="3">
            <PlusIcon aria-hidden="true" weight="bold" />
            Create your first book
          </Button>
        </BookFormDialog>
      </Column>
    </Card>
  );
}
