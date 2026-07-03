import type { components } from '@delve-moar/api-types';
import { queryOptions, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';

export type SpellDetailResponse = components['schemas']['SpellDetail'];

// Spell is the codegenned SpellDetail shape verbatim. The API validates
// the payload at the boundary via Pydantic; the FE no longer parses
// with Zod.
export type Spell = SpellDetailResponse;

function getSpell(slug: string): Promise<Spell> {
  // book_memberships powers the add-to-book control; the API omits it for
  // anonymous requests.
  return apiClient.get<Spell>(`/v1/spells/${slug}`, {
    params: { include: 'book_memberships' },
  });
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
