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

export function renderWithProvider(ui: React.ReactElement) {
  return render(ui, { wrapper: AppProvider });
}
