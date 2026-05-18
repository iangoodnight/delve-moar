import type { components } from '@delve-moar/api-types';
import { queryOptions, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';

import {
  type SrdMonsterContent,
  srdMonsterContentSchema,
} from './srd-monster-content.schema';

export type MonsterDetailResponse = components['schemas']['MonsterDetail'];

// MonsterDetailResponse with `content` narrowed via Zod. `contentSource`
// is already typed by the API contract (Pydantic ContentSource → OpenAPI →
// codegen) so it's consumed straight from the wire shape.
export interface Monster extends Omit<MonsterDetailResponse, 'content'> {
  content: SrdMonsterContent;
}

async function getMonster(slug: string): Promise<Monster> {
  const response = await apiClient.get<MonsterDetailResponse>(
    `/v1/monsters/${slug}`,
  );
  return {
    ...response,
    content: srdMonsterContentSchema.parse(response.content),
  };
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
