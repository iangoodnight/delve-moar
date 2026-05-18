import type { components } from '@delve-moar/api-types';
import { queryOptions, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';

import {
  type SrdSpellContent,
  srdSpellContentSchema,
} from './srd-spell-content.schema';

export type SpellDetailResponse = components['schemas']['SpellDetail'];

export interface Spell extends Omit<SpellDetailResponse, 'content'> {
  content: SrdSpellContent;
}

async function getSpell(slug: string): Promise<Spell> {
  const response = await apiClient.get<SpellDetailResponse>(
    `/v1/spells/${slug}`,
  );
  return {
    ...response,
    content: srdSpellContentSchema.parse(response.content),
  };
}

export function getSpellQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ['spells', 'detail', slug] as const,
    queryFn: () => getSpell(slug),
  });
}

interface UseSpellOptions {
  slug: string;
  queryConfig?: QueryConfig<typeof getSpellQueryOptions>;
}

export function useSpell({ slug, queryConfig }: UseSpellOptions) {
  return useQuery({
    ...getSpellQueryOptions(slug),
    ...queryConfig,
  });
}
