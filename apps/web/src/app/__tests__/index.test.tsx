import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '../index';

// Smoke test for the composition root: App = AppProvider + AppRouter.
// A broader behavioural matrix lives in router.test.tsx.
describe('App', () => {
  it('mounts and renders the home route', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: /delve moar/i }),
    ).toBeInTheDocument();
  });
});
