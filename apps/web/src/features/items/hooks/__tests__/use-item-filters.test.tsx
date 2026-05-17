import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useItemFilters } from '../use-item-filters';

function makeWrapper(initialEntry: string) {
  function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
    );
  }
  return Wrapper;
}

describe('useItemFilters — URL parsing', () => {
  it('parses the search param', () => {
    const { result } = renderHook(() => useItemFilters(), {
      wrapper: makeWrapper('/items?search=sword'),
    });
    expect(result.current.filters.search).toBe('sword');
  });

  it('parses the item_category param into the category field', () => {
    const { result } = renderHook(() => useItemFilters(), {
      wrapper: makeWrapper('/items?item_category=weapon'),
    });
    expect(result.current.filters.category).toBe('weapon');
  });

  it('parses the rarity param', () => {
    const { result } = renderHook(() => useItemFilters(), {
      wrapper: makeWrapper('/items?rarity=rare'),
    });
    expect(result.current.filters.rarity).toBe('rare');
  });

  it('treats absent params as undefined', () => {
    const { result } = renderHook(() => useItemFilters(), {
      wrapper: makeWrapper('/items'),
    });
    expect(result.current.filters.search).toBeUndefined();
    expect(result.current.filters.category).toBeUndefined();
    expect(result.current.filters.rarity).toBeUndefined();
  });
});

describe('useItemFilters — setters', () => {
  it('setSearch writes and clears the search param', () => {
    const { result } = renderHook(() => useItemFilters(), {
      wrapper: makeWrapper('/items'),
    });

    act(() => {
      result.current.setSearch('sword');
    });
    expect(result.current.filters.search).toBe('sword');

    act(() => {
      result.current.setSearch('');
    });
    expect(result.current.filters.search).toBeUndefined();
  });

  it('setCategory writes and clears the item_category param', () => {
    const { result } = renderHook(() => useItemFilters(), {
      wrapper: makeWrapper('/items'),
    });

    act(() => {
      result.current.setCategory('weapon');
    });
    expect(result.current.filters.category).toBe('weapon');

    act(() => {
      result.current.setCategory('');
    });
    expect(result.current.filters.category).toBeUndefined();
  });

  it('setRarity writes and clears the rarity param', () => {
    const { result } = renderHook(() => useItemFilters(), {
      wrapper: makeWrapper('/items'),
    });

    act(() => {
      result.current.setRarity('rare');
    });
    expect(result.current.filters.rarity).toBe('rare');

    act(() => {
      result.current.setRarity('');
    });
    expect(result.current.filters.rarity).toBeUndefined();
  });

  it('setCategory clears rarity when picking a category that cannot have one', () => {
    const { result } = renderHook(() => useItemFilters(), {
      wrapper: makeWrapper('/items?rarity=rare'),
    });
    expect(result.current.filters.rarity).toBe('rare');

    act(() => {
      result.current.setCategory('adventuring-gear');
    });
    expect(result.current.filters.category).toBe('adventuring-gear');
    expect(result.current.filters.rarity).toBeUndefined();
  });

  it('setCategory keeps rarity when picking a rarity-capable category', () => {
    const { result } = renderHook(() => useItemFilters(), {
      wrapper: makeWrapper('/items?rarity=rare'),
    });

    act(() => {
      result.current.setCategory('wondrous-items');
    });
    expect(result.current.filters.category).toBe('wondrous-items');
    expect(result.current.filters.rarity).toBe('rare');
  });

  it('setCategory keeps rarity for weapon and armor (magic equipment lives there)', () => {
    const { result } = renderHook(() => useItemFilters(), {
      wrapper: makeWrapper('/items?rarity=rare'),
    });

    act(() => {
      result.current.setCategory('weapon');
    });
    expect(result.current.filters.rarity).toBe('rare');

    act(() => {
      result.current.setCategory('armor');
    });
    expect(result.current.filters.rarity).toBe('rare');
  });
});
