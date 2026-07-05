import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useHashTab } from '../use-hash-tab';

const TABS = ['monsters', 'spells', 'items'] as const;

function makeWrapper(initialEntry: string) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
    );
  };
}

describe('useHashTab', () => {
  it('falls back when there is no hash', () => {
    const { result } = renderHook(() => useHashTab(TABS, 'monsters'), {
      wrapper: makeWrapper('/account/books/1'),
    });
    expect(result.current[0]).toBe('monsters');
  });

  it('reads a valid hash', () => {
    const { result } = renderHook(() => useHashTab(TABS, 'monsters'), {
      wrapper: makeWrapper('/account/books/1#spells'),
    });
    expect(result.current[0]).toBe('spells');
  });

  it('falls back on an unknown hash', () => {
    const { result } = renderHook(() => useHashTab(TABS, 'monsters'), {
      wrapper: makeWrapper('/account/books/1#bogus'),
    });
    expect(result.current[0]).toBe('monsters');
  });

  it('setActive changes the active tab', () => {
    const { result } = renderHook(() => useHashTab(TABS, 'monsters'), {
      wrapper: makeWrapper('/account/books/1'),
    });

    act(() => {
      result.current[1]('items');
    });
    expect(result.current[0]).toBe('items');
  });
});
