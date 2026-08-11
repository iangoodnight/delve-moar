import { useEffect, useState } from 'react';

import { TextField } from '@/components/ui/field';
import { Column, Row } from '@/components/ui/layout';
import { SearchField } from '@/components/ui/search-field';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/typography';
import { MONSTER_TYPES } from '@/features/monsters/constants';
import { useMonsterFilters } from '@/features/monsters/hooks';

import styles from './monster-filters.module.css';

const ALL_TYPES_VALUE = '__all__';
const CR_MIN_VALUE = 0;
const CR_MAX_VALUE = 30;
const SEARCH_DEBOUNCE_MS = 300;

function parseCrInput(raw: string): number | undefined {
  if (raw === '') return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function MonsterFilters() {
  const { filters, setSearch, setType, setCrMin, setCrMax } =
    useMonsterFilters();
  const urlSearch = filters.search ?? '';
  const [searchInput, setSearchInput] = useState<string>(urlSearch);
  // Mirrors the URL search value we've already adopted into searchInput.
  // When the URL diverges (back button, deep link), the during-render
  // equality check below detects it and re-syncs.  This is React's
  // "store information from previous renders" pattern — preferred over
  // setState-inside-useEffect, which the React Compiler flags as a cascade.
  const [prevUrlSearch, setPrevUrlSearch] = useState<string>(urlSearch);

  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearchInput(urlSearch);
  }

  // Debounce input -> URL.  The early return makes this a no-op when the
  // input already matches the URL, which covers the case where an external
  // URL change has just been adopted into searchInput by the during-render
  // sync above.
  useEffect(() => {
    if (searchInput === urlSearch) return;
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [urlSearch, searchInput, setSearch]);

  return (
    <Row
      align="end"
      gap="3"
      pb="1"
      wrap={{ initial: 'wrap-reverse', sm: 'nowrap' }}
    >
      <Column flexBasis={{ initial: '100%', sm: '50%' }}>
        <SearchField
          aria-label="Search monsters"
          focusOnSlash
          onChange={setSearchInput}
          onSubmit={() => {
            document.querySelector<HTMLElement>('[data-monster]')?.focus();
          }}
          placeholder="Search monsters..."
          value={searchInput}
        />
      </Column>
      <Column flexBasis={{ initial: '100%', sm: 'calc(50% - var(--space-3))' }}>
        <Row
          gap={{ initial: '1', xs: '3' }}
          wrap={{ initial: 'wrap', xs: 'nowrap' }}
        >
          <Column
            flexGrow="1"
            gap="1"
            minWidth={{ initial: '100%', xs: '18rem' }}
          >
            <Label htmlFor="monster-type">Type</Label>
            <Select.Root
              onValueChange={(value) => {
                setType(value === ALL_TYPES_VALUE ? '' : value);
              }}
              value={filters.type ?? ALL_TYPES_VALUE}
            >
              <Select.Trigger
                className={styles['type-trigger']}
                id="monster-type"
                placeholder="Any type"
              />
              <Select.Content>
                <Select.Item value={ALL_TYPES_VALUE}>Any type</Select.Item>
                {MONSTER_TYPES.map((type) => {
                  return (
                    <Select.Item
                      key={type}
                      className={styles['type-option']}
                      value={type}
                    >
                      {type}
                    </Select.Item>
                  );
                })}
              </Select.Content>
            </Select.Root>
          </Column>
          <Column
            flexBasis="10rem"
            flexGrow={{ initial: '1', xs: '0' }}
            gap="1"
          >
            <Label htmlFor="monster-cr-min">CR min</Label>
            <TextField.Root
              id="monster-cr-min"
              max={CR_MAX_VALUE}
              min={CR_MIN_VALUE}
              onChange={(event) => {
                setCrMin(parseCrInput(event.currentTarget.value));
              }}
              placeholder={String(CR_MIN_VALUE)}
              type="number"
              value={filters.crMin ?? ''}
            />
          </Column>
          <Column
            flexBasis="10rem"
            flexGrow={{ initial: '1', xs: '0' }}
            gap="1"
          >
            <Label htmlFor="monster-cr-max">CR max</Label>
            <TextField.Root
              id="monster-cr-max"
              max={CR_MAX_VALUE}
              min={CR_MIN_VALUE}
              onChange={(event) => {
                setCrMax(parseCrInput(event.currentTarget.value));
              }}
              placeholder={String(CR_MAX_VALUE)}
              type="number"
              value={filters.crMax ?? ''}
            />
          </Column>
        </Row>
      </Column>
    </Row>
  );
}
