import { PlusIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Column, Grid, Row } from '@/components/ui/layout';
import { Spinner } from '@/components/ui/loading';
import { H1, Text } from '@/components/ui/typography';

import { getOwnedBooksQueryOptions } from '../api/get-books';

import { AddBookCard } from './add-book-card';
import { BookCard } from './book-card';
import { BookFormDialog } from './book-form-dialog';
import { BooksEmptyState } from './books-empty-state';

export function MyBooks() {
  const { data, error, isLoading, isError } = useQuery(
    getOwnedBooksQueryOptions(),
  );
  const books = data?.data ?? [];

  return (
    <Column gap="4">
      <Row align="center" gap="3" justify="between" wrap="wrap">
        <H1>My books</H1>
        <BookFormDialog>
          <Button size="3">
            <PlusIcon aria-hidden="true" weight="bold" />
            New book
          </Button>
        </BookFormDialog>
      </Row>
      <Text color="gray" size="2">
        Collections you own. Add monsters, spells, and items to a book from
        anywhere in the app.
      </Text>

      {isLoading && (
        <Row justify="center" py="6">
          <Spinner size="3" />
        </Row>
      )}

      {isError && (
        <Callout.Root color="red" role="alert">
          <Callout.Text>
            Could not load your books. {error.message}
          </Callout.Text>
        </Callout.Root>
      )}

      {!isLoading && !isError && books.length === 0 && <BooksEmptyState />}

      {books.length > 0 && (
        <Grid columns={{ initial: '1', xs: '2', md: '3' }} gap="4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
          <AddBookCard />
        </Grid>
      )}
    </Column>
  );
}
