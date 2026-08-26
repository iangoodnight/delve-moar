import type { components } from '@delve-moar/api-types';
import {
  type QueryClient,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';

export type MonsterDetailResponse = components['schemas']['MonsterDetail'];

// Monster is the codegenned MonsterDetail shape verbatim. The API
// validates the payload at the boundary via Pydantic; the FE no longer
// parses with Zod.
export type Monster = MonsterDetailResponse;

function getMonster(slug: string): Promise<Monster> {
  // book_memberships powers the add-to-book control; the API omits it for
  // anonymous requests.
  return apiClient.get<Monster>(`/v1/monsters/${slug}`, {
    params: { include: 'book_memberships' },
  });
}

export function getMonsterQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ['monsters', 'detail', slug] as const,
    queryFn: () => getMonster(slug),
  });
}

export function prefetchMonster(queryClient: QueryClient, slug: string): void {
  // react-query deprecated prefetch* in 5.102 (removed in v6); migrate in #400
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  void queryClient.prefetchQuery(getMonsterQueryOptions(slug));
}

interface UseMonsterOptions {
  slug: string;
  queryConfig?: QueryConfig<typeof getMonsterQueryOptions>;
}

export function useMonster({ slug, queryConfig }: UseMonsterOptions) {
  return useQuery({
    ...getMonsterQueryOptions(slug),
    ...queryConfig,
  });
}
