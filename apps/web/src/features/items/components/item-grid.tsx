import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { Callout } from '@/components/ui/callout';
import { Column, Grid, Row } from '@/components/ui/layout';
import { Spinner } from '@/components/ui/loading';
import { Paragraph } from '@/components/ui/typography';
import { getItemsInfiniteQueryOptions } from '@/features/items/api';
import { useItemFilters } from '@/features/items/hooks';

import { ItemCard } from './item-card';
import { ItemCardSkeleton } from './item-card-skeleton';

const GRID_COLUMNS = 'repeat(auto-fill, minmax(28rem, 1fr))';
const SENTINEL_ROOT_MARGIN = '200px';
const SKELETON_COUNT = 8;

export function ItemGrid() {
  const { filters } = useItemFilters();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const {
    data,
    error,
    fetchNextPage,
    isError,
    isFetchingNextPage,
    isLoading,
    hasNextPage,
  } = useInfiniteQuery(getItemsInfiniteQueryOptions(filters));

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
          <ItemCardSkeleton key={index} />
        ))}
      </Grid>
    );
  }

  if (isError) {
    return (
      <Callout.Root color="red" role="alert">
        <Callout.Text>Could not load items. {error.message}</Callout.Text>
      </Callout.Root>
    );
  }

  const items = data?.pages.flatMap((page) => page.data) ?? [];

  if (items.length === 0) {
    return (
      <Callout.Root>
        <Callout.Text>No items found. Try adjusting your filters?</Callout.Text>
      </Callout.Root>
    );
  }

  return (
    <Column gap="3">
      <Grid columns={GRID_COLUMNS} gap="3">
        {items.map((item) => (
          <ItemCard item={item} key={item.slug} />
        ))}
      </Grid>
      <div aria-hidden="true" ref={sentinelRef} />
      {isFetchingNextPage && (
        <Row gap="2" justify="center" py="4">
          <Spinner />
          <Paragraph>Loading more items...</Paragraph>
        </Row>
      )}
    </Column>
  );
}
