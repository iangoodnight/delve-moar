import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '../index';

// Smoke test for the composition root: App = AppProvider + AppRouter.
// A broader behavioural matrix lives in router.test.tsx.
describe('App', () => {
  it('mounts and renders the home route', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    // Brand mark is a link to "/", not an h1 (h1 is reserved for page topic).
    expect(
      await screen.findByRole('link', { name: /delvemoar.*home/i }),
    ).toBeInTheDocument();
  });
});
