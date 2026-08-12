import type { components } from '@delve-moar/api-types';
import { infiniteQueryOptions, type QueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export type MonsterSummary = components['schemas']['MonsterSummary'];
export type MonsterListResponse =
  components['schemas']['PaginatedResultset_MonsterSummary_'];

export interface MonsterFilters {
  // `| undefined` is required for `exactOptionalPropertyTypes: true` —
  // it lets callers pass either an absent property or an explicit undefined,
  // which matches how the URL-derived hook assigns each field.
  crMin?: number | undefined;
  crMax?: number | undefined;
  search?: string | undefined;
  type?: string | undefined;
}

const LIMIT = 20;

function getMonsters(
  filters: MonsterFilters,
  offset = 0,
): Promise<MonsterListResponse> {
  return apiClient.get<MonsterListResponse>('/v1/monsters', {
    params: {
      ...(filters.search && { search: filters.search }),
      ...(filters.type && { type: filters.type }),
      ...(filters.crMin !== undefined && { cr_min: filters.crMin }),
      ...(filters.crMax !== undefined && { cr_max: filters.crMax }),
      limit: LIMIT,
      offset,
    },
  });
}

export function getMonstersInfiniteQueryOptions(filters: MonsterFilters) {
  return infiniteQueryOptions({
    queryKey: ['monsters', 'list', filters] as const,
    queryFn: ({ pageParam }) => getMonsters(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const { count, limit, offset } = lastPage.metadata.resultset;
      return offset + limit < count ? offset + limit : undefined;
    },
  });
}

// {} matches the unfiltered list's cache key (react-query drops undefined keys)
export function prefetchMonsters(
  queryClient: QueryClient,
  filters: MonsterFilters = {},
): void {
  void queryClient.prefetchInfiniteQuery(
    getMonstersInfiniteQueryOptions(filters),
  );
}
