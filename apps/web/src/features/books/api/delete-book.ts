import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import { BOOKS_QUERY_KEY } from './get-books';

async function deleteBook(bookId: string): Promise<void> {
  await apiClient.delete(`/v1/books/${bookId}`);
}

export function useDeleteBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBook,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOOKS_QUERY_KEY });
    },
  });
}
