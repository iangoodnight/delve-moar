import type { components } from '@delve-moar/api-types';
import { queryOptions, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';

import {
  type SrdItemContent,
  srdItemContentSchema,
} from './srd-item-content.schema';

export type ItemDetailResponse = components['schemas']['ItemDetail'];

export interface Item extends Omit<ItemDetailResponse, 'content'> {
  content: SrdItemContent;
}

async function getItem(slug: string): Promise<Item> {
  const response = await apiClient.get<ItemDetailResponse>(`/v1/items/${slug}`);
  return {
    ...response,
    content: srdItemContentSchema.parse(response.content),
  };
}

export function getItemQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ['items', 'detail', slug] as const,
    queryFn: () => getItem(slug),
  });
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
