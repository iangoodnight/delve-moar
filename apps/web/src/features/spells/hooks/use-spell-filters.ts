import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { SpellFilters } from '@/features/spells/api';

function readNumber(value: string | null): number | undefined {
  if (value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function useSpellFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: SpellFilters = {
    search: searchParams.get('search') ?? undefined,
    school: searchParams.get('school') ?? undefined,
    levelMin: readNumber(searchParams.get('level_min')),
    levelMax: readNumber(searchParams.get('level_max')),
  };

  const setSearch = useCallback(
    (search: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (search) {
            next.set('search', search);
          } else {
            next.delete('search');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setSchool = useCallback(
    (school: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (school) {
            next.set('school', school);
          } else {
            next.delete('school');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setLevelMin = useCallback(
    (levelMin: number | undefined) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (levelMin !== undefined) {
            next.set('level_min', String(levelMin));
            // Keep level_max >= level_min: bump the other bound if it would invert.
            const currentMax = readNumber(prev.get('level_max'));
            if (currentMax !== undefined && currentMax < levelMin) {
              next.set('level_max', String(levelMin));
            }
          } else {
            next.delete('level_min');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setLevelMax = useCallback(
    (levelMax: number | undefined) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (levelMax !== undefined) {
            next.set('level_max', String(levelMax));
            // Keep level_min <= level_max: bump the other bound if it would invert.
            const currentMin = readNumber(prev.get('level_min'));
            if (currentMin !== undefined && currentMin > levelMax) {
              next.set('level_min', String(levelMax));
            }
          } else {
            next.delete('level_max');
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
    setSchool,
    setLevelMin,
    setLevelMax,
  };
}
