import type { components } from '@delve-moar/api-types';
import {
  type QueryClient,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';

export type ItemDetailResponse = components['schemas']['ItemDetail'];

// Item is the codegenned ItemDetail shape verbatim. The API validates the
// payload at the boundary via Pydantic; the FE no longer parses with Zod.
// `Item` stays as an alias rather than `= ItemDetailResponse` for callers
// who imported the named type before the boundary parse went away.
export type Item = ItemDetailResponse;

function getItem(slug: string): Promise<Item> {
  // book_memberships powers the add-to-book control; the API omits it for
  // anonymous requests.
  return apiClient.get<Item>(`/v1/items/${slug}`, {
    params: { include: 'book_memberships' },
  });
}

export function getItemQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ['items', 'detail', slug] as const,
    queryFn: () => getItem(slug),
  });
}

export function prefetchItem(queryClient: QueryClient, slug: string): void {
  void queryClient.prefetchQuery(getItemQueryOptions(slug));
}

interface UseItemOptions {
  slug: string;
  queryConfig?: QueryConfig<typeof getItemQueryOptions>;
}

export function useItem({ slug, queryConfig }: UseItemOptions) {
  return useQuery({
    ...getItemQueryOptions(slug),
    ...queryConfig,
  });
}
