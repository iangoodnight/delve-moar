import {
  SortAscendingIcon,
  SortDescendingIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import { IconButton } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { ConfirmDestructive } from '@/components/ui/confirm-destructive';
import { Box, Column, Row } from '@/components/ui/layout';
import { Spinner } from '@/components/ui/loading';
import { SearchField } from '@/components/ui/search-field';
import { Select } from '@/components/ui/select';
import { Text } from '@/components/ui/typography';

import type { BookSortOption, SortDirection } from '../constants';

import type { BookContentRowData } from './book-content-row';
import { BookContentRow } from './book-content-row';
import styles from './book-content-section.module.css';

const SENTINEL_ROOT_MARGIN = '200px';

interface SearchControl {
  readonly value: string;
  readonly placeholder: string;
  // the debounced query is non-empty, so an empty result means "no matches".
  readonly hasActiveQuery: boolean;
  readonly onChange: (value: string) => void;
}

interface SortControl {
  readonly column: string;
  readonly direction: SortDirection;
  readonly options: readonly BookSortOption[];
  readonly onColumnChange: (value: string) => void;
  readonly onDirectionToggle: () => void;
}

interface ListState {
  readonly rows: readonly BookContentRowData[];
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly errorMessage: string | undefined;
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly onLoadMore: () => void;
}

interface BookContentSectionProps {
  // lower-cased into the copy; the tab supplies the visible label.
  readonly title: string;
  readonly emptyLabel: string;
  readonly search: SearchControl;
  readonly sort: SortControl;
  readonly list: ListState;
  readonly onRemoveRow: (id: string) => void;
}

export function BookContentSection({
  title,
  emptyLabel,
  search,
  sort,
  list,
  onRemoveRow,
}: Readonly<BookContentSectionProps>) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const {
    rows,
    isLoading,
    isError,
    errorMessage,
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
  } = list;
  const lowerTitle = title.toLowerCase();
  const isAscending = sort.direction === 'asc';

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
            onLoadMore();
          }
        });
      },
      { rootMargin: SENTINEL_ROOT_MARGIN },
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  return (
    <Column gap="3">
      {/* wrap-reverse puts search below the sort controls on mobile, matching
          the browse pages; nowrap gives one row from sm up. */}
      <Row align="end" gap="3" wrap={{ initial: 'wrap-reverse', sm: 'nowrap' }}>
        <Box
          flexBasis={{ initial: '100%', sm: 'auto' }}
          flexGrow="1"
          minWidth="0"
        >
          <SearchField
            aria-label={`Search ${lowerTitle}`}
            focusOnSlash
            onChange={search.onChange}
            placeholder={search.placeholder}
            value={search.value}
          />
        </Box>
        <Row flexBasis={{ initial: '100%', sm: 'auto' }} flexShrink="0" gap="2">
          <Box
            flexGrow={{ initial: '1', sm: '0' }}
            width={{ initial: 'auto', sm: '14rem' }}
          >
            <Select.Root
              onValueChange={sort.onColumnChange}
              value={sort.column}
            >
              <Select.Trigger
                aria-label={`Sort ${lowerTitle} by`}
                className={styles['sort-trigger']}
              />
              <Select.Content>
                {sort.options.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Box>
          <IconButton
            aria-label={`Sort direction: ${isAscending ? 'ascending' : 'descending'}`}
            onClick={sort.onDirectionToggle}
            variant="surface"
          >
            {isAscending ? (
              <SortAscendingIcon aria-hidden="true" />
            ) : (
              <SortDescendingIcon aria-hidden="true" />
            )}
          </IconButton>
        </Row>
      </Row>

      <Column aria-busy={isLoading} gap="3">
        {isLoading && (
          <Row justify="center" py="4">
            <Spinner size="3" />
          </Row>
        )}

        {isError && (
          <Callout.Root color="red" role="alert">
            <Callout.Text>
              Could not load {lowerTitle}. {errorMessage}
            </Callout.Text>
          </Callout.Root>
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <Callout.Root color="gray">
            <Callout.Text>
              {search.hasActiveQuery
                ? `No ${lowerTitle} match your search.`
                : emptyLabel}
            </Callout.Text>
          </Callout.Root>
        )}

        {rows.length > 0 && (
          <Column gap="2">
            {rows.map((row) => (
              <BookContentRow
                key={row.key}
                badges={row.badges}
                href={row.href}
                name={row.name}
                onRemove={() => {
                  setPendingRemoval({ id: row.id, name: row.name });
                }}
              />
            ))}
          </Column>
        )}

        <div aria-hidden="true" ref={sentinelRef} />

        {isFetchingNextPage && (
          <Row justify="center" py="2">
            <Spinner />
          </Row>
        )}
      </Column>

      <ConfirmDestructive
        confirmText={
          <>
            <XIcon aria-hidden="true" weight="bold" /> Remove
          </>
        }
        description={
          <Text>
            Remove <Text weight="bold">{pendingRemoval?.name}</Text> from this
            book? It stays in your account.
          </Text>
        }
        maxWidth="28rem"
        onConfirm={() => {
          if (pendingRemoval) {
            onRemoveRow(pendingRemoval.id);
          }
          setPendingRemoval(null);
        }}
        onOpenChange={(next) => {
          if (!next) {
            setPendingRemoval(null);
          }
        }}
        open={pendingRemoval !== null}
        title="Remove from book?"
      />
    </Column>
  );
}
