import type { components } from '@delve-moar/api-types';
import { infiniteQueryOptions } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export type ItemSummary = components['schemas']['ItemSummary'];
export type ItemListResponse =
  components['schemas']['PaginatedResultset_ItemSummary_'];

export interface ItemFilters {
  // `| undefined` required for `exactOptionalPropertyTypes: true`
  search?: string | undefined;
  category?: string | undefined;
  rarity?: string | undefined;
}

const LIMIT = 20;

function getItems(filters: ItemFilters, offset = 0): Promise<ItemListResponse> {
  return apiClient.get<ItemListResponse>('/v1/items', {
    params: {
      ...(filters.search && { search: filters.search }),
      ...(filters.category && { item_category: filters.category }),
      ...(filters.rarity && { rarity: filters.rarity }),
      limit: LIMIT,
      offset,
    },
  });
}

export function getItemsInfiniteQueryOptions(filters: ItemFilters) {
  return infiniteQueryOptions({
    queryKey: ['items', 'list', filters] as const,
    queryFn: ({ pageParam }) => getItems(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const { count, limit, offset } = lastPage.metadata.resultset;
      return offset + limit < count ? offset + limit : undefined;
    },
  });
}
