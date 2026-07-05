import type { components } from '@delve-moar/api-types';
import { infiniteQueryOptions } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import { BOOKS_QUERY_KEY } from './get-books';

export type BookMonster = components['schemas']['MonsterSummary'];
export type BookSpell = components['schemas']['SpellSummary'];
export type BookItem = components['schemas']['ItemSummary'];

type MonsterPage = components['schemas']['PaginatedResultset_MonsterSummary_'];
type SpellPage = components['schemas']['PaginatedResultset_SpellSummary_'];
type ItemPage = components['schemas']['PaginatedResultset_ItemSummary_'];

export interface BookContentFilters {
  search?: string | undefined;
  orderBy?: string | undefined;
}

const LIMIT = 20;

function buildParams(filters: BookContentFilters, offset: number) {
  return {
    ...(filters.search && { search: filters.search }),
    ...(filters.orderBy && { order_by: filters.orderBy }),
    limit: LIMIT,
    offset,
  };
}

// Pages are exhausted once offset + limit has covered the total count.
function nextOffset(metadata: MonsterPage['metadata']): number | undefined {
  const { count, limit, offset } = metadata.resultset;
  return offset + limit < count ? offset + limit : undefined;
}

export function getBookMonstersInfiniteQueryOptions(
  bookId: string,
  filters: BookContentFilters,
) {
  return infiniteQueryOptions({
    queryKey: [...BOOKS_QUERY_KEY, 'contents', bookId, 'monsters', filters],
    queryFn: ({ pageParam }) =>
      apiClient.get<MonsterPage>(`/v1/books/${bookId}/monsters`, {
        params: buildParams(filters, pageParam),
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => nextOffset(lastPage.metadata),
  });
}

export function getBookSpellsInfiniteQueryOptions(
  bookId: string,
  filters: BookContentFilters,
) {
  return infiniteQueryOptions({
    queryKey: [...BOOKS_QUERY_KEY, 'contents', bookId, 'spells', filters],
    queryFn: ({ pageParam }) =>
      apiClient.get<SpellPage>(`/v1/books/${bookId}/spells`, {
        params: buildParams(filters, pageParam),
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => nextOffset(lastPage.metadata),
  });
}

export function getBookItemsInfiniteQueryOptions(
  bookId: string,
  filters: BookContentFilters,
) {
  return infiniteQueryOptions({
    queryKey: [...BOOKS_QUERY_KEY, 'contents', bookId, 'items', filters],
    queryFn: ({ pageParam }) =>
      apiClient.get<ItemPage>(`/v1/books/${bookId}/items`, {
        params: buildParams(filters, pageParam),
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => nextOffset(lastPage.metadata),
  });
}
