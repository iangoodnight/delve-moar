import { useEffect, useState } from 'react';

import { TextField } from '@/components/ui/field';
import { Column, Row } from '@/components/ui/layout';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/typography';
import { VisuallyHidden } from '@/components/ui/utils';
import {
  SPELL_LEVEL_OPTIONS,
  SPELL_SCHOOLS,
} from '@/features/spells/constants';
import { useSpellFilters } from '@/features/spells/hooks';

import styles from './spell-filters.module.css';

const ALL_VALUE = '__all__';
const SEARCH_DEBOUNCE_MS = 300;

export function SpellFilters() {
  const { filters, setSearch, setSchool, setLevelMin, setLevelMax } =
    useSpellFilters();
  const urlSearch = filters.search ?? '';
  const [searchInput, setSearchInput] = useState<string>(urlSearch);
  const [prevUrlSearch, setPrevUrlSearch] = useState<string>(urlSearch);

  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearchInput(urlSearch);
  }

  const handleSearchKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      document.querySelector<HTMLElement>('[data-spell]')?.focus();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setSearchInput('');
      setSearch('');
    }
  };

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
      <Column flexBasis={{ initial: '100%', sm: '40%' }}>
        <Label>
          <VisuallyHidden>Search spells</VisuallyHidden>
          <TextField.Root
            onChange={(event) => {
              setSearchInput(event.currentTarget.value);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search spells..."
            value={searchInput}
          />
        </Label>
      </Column>
      <Column flexBasis={{ initial: '100%', sm: 'calc(60% - var(--space-3))' }}>
        <Row
          gap={{ initial: '1', xs: '3' }}
          wrap={{ initial: 'wrap', xs: 'nowrap' }}
        >
          <Column
            flexGrow="1"
            gap="1"
            minWidth={{ initial: '100%', xs: '18rem' }}
          >
            <Label htmlFor="spell-school">School</Label>
            <Select.Root
              onValueChange={(value) => {
                setSchool(value === ALL_VALUE ? '' : value);
              }}
              value={filters.school ?? ALL_VALUE}
            >
              <Select.Trigger
                className={styles['school-trigger']}
                id="spell-school"
                placeholder="Any school"
              />
              <Select.Content>
                <Select.Item value={ALL_VALUE}>Any school</Select.Item>
                {SPELL_SCHOOLS.map((school) => (
                  <Select.Item
                    key={school}
                    className={styles['school-option']}
                    value={school}
                  >
                    {school}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Column>
          <Column
            flexBasis="12rem"
            flexGrow={{ initial: '1', xs: '0' }}
            gap="1"
          >
            <Label htmlFor="spell-level-min">Level min</Label>
            <Select.Root
              onValueChange={(value) => {
                setLevelMin(value === ALL_VALUE ? undefined : Number(value));
              }}
              value={
                filters.levelMin !== undefined
                  ? String(filters.levelMin)
                  : ALL_VALUE
              }
            >
              <Select.Trigger id="spell-level-min" placeholder="Any" />
              <Select.Content>
                <Select.Item value={ALL_VALUE}>Any</Select.Item>
                {SPELL_LEVEL_OPTIONS.map((opt) => (
                  <Select.Item key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Column>
          <Column
            flexBasis="12rem"
            flexGrow={{ initial: '1', xs: '0' }}
            gap="1"
          >
            <Label htmlFor="spell-level-max">Level max</Label>
            <Select.Root
              onValueChange={(value) => {
                setLevelMax(value === ALL_VALUE ? undefined : Number(value));
              }}
              value={
                filters.levelMax !== undefined
                  ? String(filters.levelMax)
                  : ALL_VALUE
              }
            >
              <Select.Trigger id="spell-level-max" placeholder="Any" />
              <Select.Content>
                <Select.Item value={ALL_VALUE}>Any</Select.Item>
                {SPELL_LEVEL_OPTIONS.map((opt) => (
                  <Select.Item key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Column>
        </Row>
      </Column>
    </Row>
  );
}
