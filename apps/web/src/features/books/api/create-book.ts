import type { components } from '@delve-moar/api-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import type { Book } from './get-book';
import { BOOKS_QUERY_KEY } from './get-books';

export type BookCreate = components['schemas']['BookCreate'];

function createBook(data: BookCreate): Promise<Book> {
  return apiClient.post<Book>('/v1/books', data);
}

export function useCreateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBook,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOOKS_QUERY_KEY });
    },
  });
}
