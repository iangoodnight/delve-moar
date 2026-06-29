import { useParams } from 'react-router-dom';

import { Head } from '@/components/seo/head';
import { Badge } from '@/components/ui/badge';
import { Callout } from '@/components/ui/callout';
import { Box, Column, Row } from '@/components/ui/layout';
import { Spinner } from '@/components/ui/loading';
import { RouterLink } from '@/components/ui/navigation';
import { H1, Text } from '@/components/ui/typography';
import { paths } from '@/config/paths';
import { useBook } from '@/features/books/api';
import { ApiError } from '@/lib/api-client';

export default function AccountBookDetail() {
  const { bookId } = useParams<{ bookId: string }>();
  const safeId = bookId ?? '';

  const { data: book, error, isLoading, isError } = useBook({ bookId: safeId });
  const isNotFound = error instanceof ApiError && error.status === 404;

  return (
    <Column aria-busy={isLoading} gap="4" mb="8">
      <Head title={book?.name ?? 'Book'} />

      {isLoading && (
        <Row justify="center" py="6">
          <Spinner size="3" />
        </Row>
      )}

      {isError && isNotFound && (
        <Callout.Root color="amber" role="alert">
          <Callout.Text>Book not found.</Callout.Text>
        </Callout.Root>
      )}
      {isError && !isNotFound && (
        <Callout.Root color="red" role="alert">
          <Callout.Text>Could not load this book. {error.message}</Callout.Text>
        </Callout.Root>
      )}

      {book && (
        <>
          <H1>{book.name}</H1>
          {book.description !== null && book.description !== '' && (
            <Text color="gray">{book.description}</Text>
          )}
          <Row gap="2" wrap="wrap">
            <Badge color="gray">{book.monsterCount} monsters</Badge>
            <Badge color="gray">{book.spellCount} spells</Badge>
            <Badge color="gray">{book.itemCount} items</Badge>
          </Row>
          <Callout.Root color="gray">
            <Callout.Text>
              Contents listing (by type, with search and sort) lands next.
            </Callout.Text>
          </Callout.Root>
        </>
      )}

      <Box>
        <RouterLink to={paths.accountBooks.getHref()}>
          Back to My books
        </RouterLink>
      </Box>
    </Column>
  );
}
