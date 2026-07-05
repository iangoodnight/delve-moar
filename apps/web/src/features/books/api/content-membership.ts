import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import { BOOKS_QUERY_KEY } from './get-books';

export type ContentType = 'monster' | 'spell' | 'item';

const PATH_SEGMENT: Record<ContentType, string> = {
  monster: 'monsters',
  spell: 'spells',
  item: 'items',
};

export interface ContentMembershipArgs {
  bookId: string;
  contentType: ContentType;
  contentId: string;
}

function membershipUrl({
  bookId,
  contentType,
  contentId,
}: ContentMembershipArgs): string {
  return `/v1/books/${bookId}/${PATH_SEGMENT[contentType]}/${contentId}`;
}

async function addContentToBook(args: ContentMembershipArgs): Promise<void> {
  await apiClient.put(membershipUrl(args));
}

async function removeContentFromBook(
  args: ContentMembershipArgs,
): Promise<void> {
  await apiClient.delete(membershipUrl(args));
}

// Invalidate the books tree (My Books counts, book contents) and the affected
// content type (its detail carries book_memberships; its lists carry badges).
// PATH_SEGMENT doubles as the content query-key root: get-monster keys on
// ['monsters', ...], etc.
function invalidateAfterMembership(
  queryClient: ReturnType<typeof useQueryClient>,
  contentType: ContentType,
) {
  void queryClient.invalidateQueries({ queryKey: BOOKS_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: [PATH_SEGMENT[contentType]] });
}

export function useAddContentToBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addContentToBook,
    onSuccess: (_data, variables) => {
      invalidateAfterMembership(queryClient, variables.contentType);
    },
  });
}

export function useRemoveContentFromBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeContentFromBook,
    onSuccess: (_data, variables) => {
      invalidateAfterMembership(queryClient, variables.contentType);
    },
  });
}
