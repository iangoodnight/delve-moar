import type { components } from '@delve-moar/api-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import type { Book } from './get-book';
import { BOOKS_QUERY_KEY } from './get-books';

export type BookUpdate = components['schemas']['BookUpdate'];

interface UpdateBookArgs {
  bookId: string;
  data: BookUpdate;
}

function updateBook({ bookId, data }: UpdateBookArgs): Promise<Book> {
  return apiClient.patch<Book>(`/v1/books/${bookId}`, data);
}

export function useUpdateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBook,
    onSuccess: (book) => {
      queryClient.setQueryData(
        [...BOOKS_QUERY_KEY, 'detail', book.id] as const,
        book,
      );
      void queryClient.invalidateQueries({ queryKey: BOOKS_QUERY_KEY });
    },
  });
}
