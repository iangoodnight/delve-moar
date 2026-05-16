import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useSpellFilters } from '../use-spell-filters';

function makeWrapper(initialEntry: string) {
  function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
    );
  }
  return Wrapper;
}

describe('useSpellFilters — URL parsing', () => {
  it('parses the search param', () => {
    const { result } = renderHook(() => useSpellFilters(), {
      wrapper: makeWrapper('/spells?search=fire'),
    });
    expect(result.current.filters.search).toBe('fire');
  });

  it('parses the school param', () => {
    const { result } = renderHook(() => useSpellFilters(), {
      wrapper: makeWrapper('/spells?school=evocation'),
    });
    expect(result.current.filters.school).toBe('evocation');
  });

  it('parses level_min and level_max as numbers', () => {
    const { result } = renderHook(() => useSpellFilters(), {
      wrapper: makeWrapper('/spells?level_min=1&level_max=5'),
    });
    expect(result.current.filters.levelMin).toBe(1);
    expect(result.current.filters.levelMax).toBe(5);
  });

  it('treats absent params as undefined', () => {
    const { result } = renderHook(() => useSpellFilters(), {
      wrapper: makeWrapper('/spells'),
    });
    expect(result.current.filters.search).toBeUndefined();
    expect(result.current.filters.school).toBeUndefined();
    expect(result.current.filters.levelMin).toBeUndefined();
    expect(result.current.filters.levelMax).toBeUndefined();
  });

  it('treats non-numeric level values as undefined', () => {
    const { result } = renderHook(() => useSpellFilters(), {
      wrapper: makeWrapper('/spells?level_min=abc'),
    });
    expect(result.current.filters.levelMin).toBeUndefined();
  });
});

describe('useSpellFilters — setters', () => {
  it('setSearch writes and clears the search param', () => {
    const { result } = renderHook(() => useSpellFilters(), {
      wrapper: makeWrapper('/spells'),
    });

    act(() => {
      result.current.setSearch('fire');
    });
    expect(result.current.filters.search).toBe('fire');

    act(() => {
      result.current.setSearch('');
    });
    expect(result.current.filters.search).toBeUndefined();
  });

  it('setSchool writes and clears the school param', () => {
    const { result } = renderHook(() => useSpellFilters(), {
      wrapper: makeWrapper('/spells'),
    });

    act(() => {
      result.current.setSchool('evocation');
    });
    expect(result.current.filters.school).toBe('evocation');

    act(() => {
      result.current.setSchool('');
    });
    expect(result.current.filters.school).toBeUndefined();
  });

  it('setLevelMin writes and clears the level_min param', () => {
    const { result } = renderHook(() => useSpellFilters(), {
      wrapper: makeWrapper('/spells'),
    });

    act(() => {
      result.current.setLevelMin(2);
    });
    expect(result.current.filters.levelMin).toBe(2);

    act(() => {
      result.current.setLevelMin(undefined);
    });
    expect(result.current.filters.levelMin).toBeUndefined();
  });

  it('setLevelMax writes and clears the level_max param', () => {
    const { result } = renderHook(() => useSpellFilters(), {
      wrapper: makeWrapper('/spells'),
    });

    act(() => {
      result.current.setLevelMax(7);
    });
    expect(result.current.filters.levelMax).toBe(7);

    act(() => {
      result.current.setLevelMax(undefined);
    });
    expect(result.current.filters.levelMax).toBeUndefined();
  });

  it('setLevelMin bumps level_max up when the new min would exceed it', () => {
    const { result } = renderHook(() => useSpellFilters(), {
      wrapper: makeWrapper('/spells?level_min=1&level_max=3'),
    });

    act(() => {
      result.current.setLevelMin(5);
    });
    expect(result.current.filters.levelMin).toBe(5);
    expect(result.current.filters.levelMax).toBe(5);
  });

  it('setLevelMax bumps level_min down when the new max would be below it', () => {
    const { result } = renderHook(() => useSpellFilters(), {
      wrapper: makeWrapper('/spells?level_min=4&level_max=7'),
    });

    act(() => {
      result.current.setLevelMax(2);
    });
    expect(result.current.filters.levelMax).toBe(2);
    expect(result.current.filters.levelMin).toBe(2);
  });

  it('setLevelMin leaves level_max alone when the new min is at or below it', () => {
    const { result } = renderHook(() => useSpellFilters(), {
      wrapper: makeWrapper('/spells?level_min=1&level_max=5'),
    });

    act(() => {
      result.current.setLevelMin(3);
    });
    expect(result.current.filters.levelMin).toBe(3);
    expect(result.current.filters.levelMax).toBe(5);
  });
});
