import { useEffect, useState } from 'react';

import { TextField } from '@/components/ui/field';
import { Column, Row } from '@/components/ui/layout';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/typography';
import { VisuallyHidden } from '@/components/ui/utils';
import {
  isRarityCapable,
  ITEM_CATEGORIES,
  ITEM_RARITIES,
} from '@/features/items/constants';
import { useItemFilters } from '@/features/items/hooks';

import styles from './item-filters.module.css';

const ALL_VALUE = '__all__';
const SEARCH_DEBOUNCE_MS = 300;

export function ItemFilters() {
  const { filters, setSearch, setCategory, setRarity } = useItemFilters();
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
      document.querySelector<HTMLElement>('[data-item]')?.focus();
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

  const rarityEnabled = isRarityCapable(filters.category);

  return (
    <Row
      align="end"
      gap="3"
      pb="1"
      wrap={{ initial: 'wrap-reverse', sm: 'nowrap' }}
    >
      <Column flexBasis={{ initial: '100%', sm: '40%' }}>
        <Label>
          <VisuallyHidden>Search items</VisuallyHidden>
          <TextField.Root
            onChange={(event) => {
              setSearchInput(event.currentTarget.value);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search items..."
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
            <Label htmlFor="item-category">Category</Label>
            <Select.Root
              onValueChange={(value) => {
                setCategory(value === ALL_VALUE ? '' : value);
              }}
              value={filters.category ?? ALL_VALUE}
            >
              <Select.Trigger
                className={styles['category-trigger']}
                id="item-category"
                placeholder="Any category"
              />
              <Select.Content>
                <Select.Item value={ALL_VALUE}>Any category</Select.Item>
                {ITEM_CATEGORIES.map((category) => (
                  <Select.Item key={category.value} value={category.value}>
                    {category.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Column>
          <Column
            flexBasis="14rem"
            flexGrow={{ initial: '1', xs: '0' }}
            gap="1"
          >
            <Label htmlFor="item-rarity">Rarity</Label>
            <Select.Root
              disabled={!rarityEnabled}
              onValueChange={(value) => {
                setRarity(value === ALL_VALUE ? '' : value);
              }}
              value={filters.rarity ?? ALL_VALUE}
            >
              <Select.Trigger id="item-rarity" placeholder="Any rarity" />
              <Select.Content>
                <Select.Item value={ALL_VALUE}>Any rarity</Select.Item>
                {ITEM_RARITIES.map((rarity) => (
                  <Select.Item key={rarity.value} value={rarity.value}>
                    {rarity.label}
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
