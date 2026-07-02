import { SortAscendingIcon, SortDescendingIcon } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';

import { IconButton } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { TextField } from '@/components/ui/field';
import { Box, Column, Row } from '@/components/ui/layout';
import { Spinner } from '@/components/ui/loading';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/typography';
import { VisuallyHidden } from '@/components/ui/utils';

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
}

export function BookContentSection({
  title,
  emptyLabel,
  search,
  sort,
  list,
}: Readonly<BookContentSectionProps>) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
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
          <Label>
            <VisuallyHidden>Search {lowerTitle}</VisuallyHidden>
            <TextField.Root
              onChange={(event) => {
                search.onChange(event.currentTarget.value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  search.onChange('');
                }
              }}
              placeholder={search.placeholder}
              value={search.value}
            />
          </Label>
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
                href={row.href}
                meta={row.meta}
                name={row.name}
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
    </Column>
  );
}
