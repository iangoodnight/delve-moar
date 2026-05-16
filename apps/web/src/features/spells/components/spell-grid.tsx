import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { Callout } from '@/components/ui/callout';
import { Column, Grid, Row } from '@/components/ui/layout';
import { Spinner } from '@/components/ui/loading';
import { Paragraph } from '@/components/ui/typography';
import { getSpellsInfiniteQueryOptions } from '@/features/spells/api';
import { useSpellFilters } from '@/features/spells/hooks';

import { SpellCard } from './spell-card';
import { SpellCardSkeleton } from './spell-card-skeleton';

const GRID_COLUMNS = 'repeat(auto-fill, minmax(28rem, 1fr))';
const SENTINEL_ROOT_MARGIN = '200px';
const SKELETON_COUNT = 8;

export function SpellGrid() {
  const { filters } = useSpellFilters();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const {
    data,
    error,
    fetchNextPage,
    isError,
    isFetchingNextPage,
    isLoading,
    hasNextPage,
  } = useInfiniteQuery(getSpellsInfiniteQueryOptions(filters));

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        });
      },
      { rootMargin: SENTINEL_ROOT_MARGIN },
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (isLoading) {
    return (
      <Grid aria-busy="true" columns={GRID_COLUMNS} gap="3">
        {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
          <SpellCardSkeleton key={index} />
        ))}
      </Grid>
    );
  }

  if (isError) {
    return (
      <Callout.Root color="red" role="alert">
        <Callout.Text>Could not load spells. {error.message}</Callout.Text>
      </Callout.Root>
    );
  }

  const spells = data?.pages.flatMap((page) => page.data) ?? [];

  if (spells.length === 0) {
    return (
      <Callout.Root>
        <Callout.Text>
          No spells found. Try adjusting your filters?
        </Callout.Text>
      </Callout.Root>
    );
  }

  return (
    <Column gap="3">
      <Grid columns={GRID_COLUMNS} gap="3">
        {spells.map((spell) => (
          <SpellCard key={spell.slug} spell={spell} />
        ))}
      </Grid>
      <div aria-hidden="true" ref={sentinelRef} />
      {isFetchingNextPage && (
        <Row gap="2" justify="center" py="4">
          <Spinner />
          <Paragraph>Loading more spells...</Paragraph>
        </Row>
      )}
    </Column>
  );
}
