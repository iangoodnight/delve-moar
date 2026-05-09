import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useMonsterFilters } from '../use-monster-filters';

function makeWrapper(initialEntry: string) {
  function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
    );
  }
  return Wrapper;
}

// We verify setter behaviour by reading the hook's own derived `filters`
// object after the act().  That avoids a mutable outer reference (which the
// React Compiler rightly flags) and keeps the assertion close to how
// consumers actually observe state.

describe('useMonsterFilters — URL parsing', () => {
  it('parses the search param', () => {
    const { result } = renderHook(() => useMonsterFilters(), {
      wrapper: makeWrapper('/monsters?search=dragon'),
    });
    expect(result.current.filters.search).toBe('dragon');
  });

  it('parses the type param', () => {
    const { result } = renderHook(() => useMonsterFilters(), {
      wrapper: makeWrapper('/monsters?type=undead'),
    });
    expect(result.current.filters.type).toBe('undead');
  });

  it('parses cr_min and cr_max as numbers', () => {
    const { result } = renderHook(() => useMonsterFilters(), {
      wrapper: makeWrapper('/monsters?cr_min=2&cr_max=10'),
    });
    expect(result.current.filters.crMin).toBe(2);
    expect(result.current.filters.crMax).toBe(10);
  });

  it('treats absent params as undefined', () => {
    const { result } = renderHook(() => useMonsterFilters(), {
      wrapper: makeWrapper('/monsters'),
    });
    expect(result.current.filters.search).toBeUndefined();
    expect(result.current.filters.type).toBeUndefined();
    expect(result.current.filters.crMin).toBeUndefined();
    expect(result.current.filters.crMax).toBeUndefined();
  });

  it('treats non-numeric cr values as undefined', () => {
    const { result } = renderHook(() => useMonsterFilters(), {
      wrapper: makeWrapper('/monsters?cr_min=abc'),
    });
    expect(result.current.filters.crMin).toBeUndefined();
  });
});

describe('useMonsterFilters — setters', () => {
  it('setSearch writes the search param', () => {
    const { result } = renderHook(() => useMonsterFilters(), {
      wrapper: makeWrapper('/monsters'),
    });

    act(() => {
      result.current.setSearch('dragon');
    });

    expect(result.current.filters.search).toBe('dragon');
  });

  it('setSearch with empty string deletes the search param', () => {
    const { result } = renderHook(() => useMonsterFilters(), {
      wrapper: makeWrapper('/monsters?search=dragon'),
    });

    act(() => {
      result.current.setSearch('');
    });

    expect(result.current.filters.search).toBeUndefined();
  });

  it('setType writes and clears the type param', () => {
    const { result } = renderHook(() => useMonsterFilters(), {
      wrapper: makeWrapper('/monsters'),
    });

    act(() => {
      result.current.setType('undead');
    });
    expect(result.current.filters.type).toBe('undead');

    act(() => {
      result.current.setType('');
    });
    expect(result.current.filters.type).toBeUndefined();
  });

  it('setCrMin writes and clears the cr_min param', () => {
    const { result } = renderHook(() => useMonsterFilters(), {
      wrapper: makeWrapper('/monsters'),
    });

    act(() => {
      result.current.setCrMin(5);
    });
    expect(result.current.filters.crMin).toBe(5);

    act(() => {
      result.current.setCrMin(undefined);
    });
    expect(result.current.filters.crMin).toBeUndefined();
  });

  it('setCrMax writes and clears the cr_max param', () => {
    const { result } = renderHook(() => useMonsterFilters(), {
      wrapper: makeWrapper('/monsters'),
    });

    act(() => {
      result.current.setCrMax(20);
    });
    expect(result.current.filters.crMax).toBe(20);

    act(() => {
      result.current.setCrMax(undefined);
    });
    expect(result.current.filters.crMax).toBeUndefined();
  });
});
