import '@testing-library/jest-dom/vitest';
import 'vitest-axe/extend-expect';
import { render } from '@testing-library/react';
import { expect } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';

import { AppProvider } from '@/app/provider';

expect.extend(axeMatchers);

// jsdom does not implement the Canvas API. axe-core calls getContext during
// color-contrast checks, which triggers a "not implemented" warning. Stub it
// out to keep test output clean.
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => null,
});

// jsdom does not implement IntersectionObserver. Components that use it
// (e.g., MonsterGrid's bottom sentinel for infinite scroll) crash on mount
// without this stub.  observe/unobserve/disconnect are no-ops; tests that
// need to drive intersection events should mock more specifically.
class StubIntersectionObserver {
  observe() {
    /* no-op */
  }
  unobserve() {
    /* no-op */
  }
  disconnect() {
    /* no-op */
  }
  takeRecords() {
    return [];
  }
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  value: StubIntersectionObserver,
});

// jsdom does not implement ResizeObserver either. Several Radix Themes
// components (Select, ScrollArea) instantiate one on mount and crash without
// it. Same shape as the IntersectionObserver stub.
class StubResizeObserver {
  observe() {
    /* no-op */
  }
  unobserve() {
    /* no-op */
  }
  disconnect() {
    /* no-op */
  }
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: StubResizeObserver,
});

export function renderWithProvider(ui: React.ReactElement) {
  return render(ui, { wrapper: AppProvider });
}
