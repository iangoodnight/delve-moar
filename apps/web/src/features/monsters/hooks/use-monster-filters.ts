import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { MonsterFilters } from '@/features/monsters/api';

function readNumber(value: string | null): number | undefined {
  if (value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function withParam(
  prev: URLSearchParams,
  key: string,
  value: string | undefined,
): URLSearchParams {
  const next = new URLSearchParams(prev);
  if (value !== undefined && value !== '') {
    next.set(key, value);
  } else {
    next.delete(key);
  }
  return next;
}

export function useMonsterFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: MonsterFilters = {
    search: searchParams.get('search') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    crMin: readNumber(searchParams.get('cr_min')),
    crMax: readNumber(searchParams.get('cr_max')),
  };

  const setSearch = useCallback(
    (search: string) => {
      setSearchParams((prev) => withParam(prev, 'search', search), {
        replace: true,
      });
    },
    [setSearchParams],
  );

  const setType = useCallback(
    (type: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (type) {
            next.set('type', type);
          } else {
            next.delete('type');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setCrMin = useCallback(
    (crMin: number | undefined) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (crMin !== undefined) {
            next.set('cr_min', String(crMin));
          } else {
            next.delete('cr_min');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setCrMax = useCallback(
    (crMax: number | undefined) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (crMax !== undefined) {
            next.set('cr_max', String(crMax));
          } else {
            next.delete('cr_max');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return {
    filters,
    setSearch,
    setType,
    setCrMin,
    setCrMax,
  };
}
