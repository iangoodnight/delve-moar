import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { ItemFilters } from '@/features/items/api';
import { isRarityCapable } from '@/features/items/constants';

export function useItemFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: ItemFilters = {
    search: searchParams.get('search') ?? undefined,
    category: searchParams.get('item_category') ?? undefined,
    rarity: searchParams.get('rarity') ?? undefined,
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

  const setCategory = useCallback(
    (category: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (category) {
            next.set('item_category', category);
            // Mundane-only categories never carry a rarity; drop the
            // rarity filter so the user does not land on an empty list.
            if (!isRarityCapable(category)) {
              next.delete('rarity');
            }
          } else {
            next.delete('item_category');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setRarity = useCallback(
    (rarity: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (rarity) {
            next.set('rarity', rarity);
          } else {
            next.delete('rarity');
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
    setCategory,
    setRarity,
  };
}
