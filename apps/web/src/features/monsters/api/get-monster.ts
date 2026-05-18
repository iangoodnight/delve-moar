import type { components } from '@delve-moar/api-types';
import { queryOptions, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';

export type MonsterDetailResponse = components['schemas']['MonsterDetail'];

// Monster is the codegenned MonsterDetail shape verbatim. The API
// validates the payload at the boundary via Pydantic; the FE no longer
// parses with Zod.
export type Monster = MonsterDetailResponse;

function getMonster(slug: string): Promise<Monster> {
  return apiClient.get<Monster>(`/v1/monsters/${slug}`);
}

export function getMonsterQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ['monsters', 'detail', slug] as const,
    queryFn: () => getMonster(slug),
  });
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
