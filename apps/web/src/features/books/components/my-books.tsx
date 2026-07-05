import { PlusIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Column, Grid, Row } from '@/components/ui/layout';
import { H1, Text } from '@/components/ui/typography';

import { getOwnedBooksQueryOptions } from '../api/get-books';

import { AddBookCard } from './add-book-card';
import { BookCard } from './book-card';
import { BookCardSkeleton } from './book-card-skeleton';
import { BookFormDialog } from './book-form-dialog';
import { BooksEmptyState } from './books-empty-state';

const GRID_COLUMNS = { initial: '1', xs: '2', md: '3' } as const;
const SKELETON_COUNT = 3;

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
        <Grid aria-busy="true" columns={GRID_COLUMNS} gap="4">
          {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <BookCardSkeleton key={index} />
          ))}
        </Grid>
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
        <Grid columns={GRID_COLUMNS} gap="4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
          <AddBookCard />
        </Grid>
      )}
    </Column>
  );
}
