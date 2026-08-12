import type { components } from '@delve-moar/api-types';
import {
  type QueryClient,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';

import { BOOKS_QUERY_KEY } from './get-books';

export type Book = components['schemas']['BookDetail'];

function getBook(bookId: string): Promise<Book> {
  return apiClient.get<Book>(`/v1/books/${bookId}`);
}

export function getBookQueryOptions(bookId: string) {
  return queryOptions({
    queryKey: [...BOOKS_QUERY_KEY, 'detail', bookId] as const,
    queryFn: () => getBook(bookId),
  });
}

export function prefetchBook(queryClient: QueryClient, bookId: string): void {
  void queryClient.prefetchQuery(getBookQueryOptions(bookId));
}

interface UseBookOptions {
  bookId: string;
  queryConfig?: QueryConfig<typeof getBookQueryOptions>;
}

export function useBook({ bookId, queryConfig }: UseBookOptions) {
  return useQuery({
    ...getBookQueryOptions(bookId),
    ...queryConfig,
  });
}
