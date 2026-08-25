import type { components } from '@delve-moar/api-types';
import { infiniteQueryOptions, type QueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export type SpellSummary = components['schemas']['SpellSummary'];
export type SpellListResponse =
  components['schemas']['PaginatedResultset_SpellSummary_'];

export interface SpellFilters {
  // `| undefined` required for `exactOptionalPropertyTypes: true`
  search?: string | undefined;
  school?: string | undefined;
  levelMin?: number | undefined;
  levelMax?: number | undefined;
}

const LIMIT = 20;

function getSpells(
  filters: SpellFilters,
  offset = 0,
): Promise<SpellListResponse> {
  return apiClient.get<SpellListResponse>('/v1/spells', {
    params: {
      ...(filters.search && { search: filters.search }),
      ...(filters.school && { school: filters.school }),
      ...(filters.levelMin !== undefined && { level_min: filters.levelMin }),
      ...(filters.levelMax !== undefined && { level_max: filters.levelMax }),
      limit: LIMIT,
      offset,
    },
  });
}

export function getSpellsInfiniteQueryOptions(filters: SpellFilters) {
  return infiniteQueryOptions({
    queryKey: ['spells', 'list', filters] as const,
    queryFn: ({ pageParam }) => getSpells(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const { count, limit, offset } = lastPage.metadata.resultset;
      return offset + limit < count ? offset + limit : undefined;
    },
  });
}

// {} matches the unfiltered list's cache key (react-query drops undefined keys)
export function prefetchSpells(
  queryClient: QueryClient,
  filters: SpellFilters = {},
): void {
  // react-query deprecated prefetch* in 5.102 (removed in v6); migrate in #400
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  void queryClient.prefetchInfiniteQuery(
    getSpellsInfiniteQueryOptions(filters),
  );
}
