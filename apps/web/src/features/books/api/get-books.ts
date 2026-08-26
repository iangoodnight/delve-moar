import type { components } from '@delve-moar/api-types';
import { type QueryClient, queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export type BookSummary = components['schemas']['BookSummary'];
export type BookListResponse =
  components['schemas']['PaginatedResultset_BookSummary_'];

// Root key for every books query, so mutations can invalidate broadly.
export const BOOKS_QUERY_KEY = ['books'] as const;

// Owned books are few; one generous page beats wiring infinite scroll.
const OWNED_LIMIT = 100;

function getOwnedBooks(): Promise<BookListResponse> {
  return apiClient.get<BookListResponse>('/v1/books', {
    params: { scope: 'owned', order_by: 'name:asc', limit: OWNED_LIMIT },
  });
}

export function getOwnedBooksQueryOptions() {
  return queryOptions({
    queryKey: [...BOOKS_QUERY_KEY, 'list', 'owned'] as const,
    queryFn: getOwnedBooks,
  });
}

// owner-scoped; an anonymous hover just no-ops on the 401
export function prefetchOwnedBooks(queryClient: QueryClient): void {
  // react-query deprecated prefetch* in 5.102 (removed in v6); migrate in #400
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  void queryClient.prefetchQuery(getOwnedBooksQueryOptions());
}
