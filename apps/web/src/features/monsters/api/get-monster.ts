import type { components } from '@delve-moar/api-types';
import { queryOptions, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';
import {
  type SrdContentSource,
  srdContentSourceSchema,
} from '@/lib/srd-content-source.schema';

import {
  type SrdMonsterContent,
  srdMonsterContentSchema,
} from './srd-monster-content.schema';

export type MonsterDetailResponse = components['schemas']['MonsterDetail'];

// MonsterDetailResponse with `content` and `contentSource` parsed and typed
// against the SRD schemas. The wire shapes are opaque (`{ [k]: unknown }`);
// we narrow them at the API boundary so renderers see typed values.
export interface Monster extends Omit<
  MonsterDetailResponse,
  'content' | 'contentSource'
> {
  content: SrdMonsterContent;
  contentSource: SrdContentSource;
}

async function getMonster(slug: string): Promise<Monster> {
  const response = await apiClient.get<MonsterDetailResponse>(
    `/v1/monsters/${slug}`,
  );
  return {
    ...response,
    content: srdMonsterContentSchema.parse(response.content),
    contentSource: srdContentSourceSchema.parse(response.contentSource),
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
