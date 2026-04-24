import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppProvider } from '../provider';
import { AppRouter } from '../router';

// Routes are lazy-loaded, so assertions use async findByRole to wait for
// the dynamic import to resolve and the component to mount.
describe('AppRouter', () => {
  it('renders the home page at /', async () => {
    window.history.pushState({}, '', '/');
    render(
      <AppProvider>
        <AppRouter />
      </AppProvider>,
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: /delve moar/i }),
    ).toBeInTheDocument();
  });

  it('renders the not-found page for an unknown path', async () => {
    window.history.pushState({}, '', '/this/does/not/exist');
    render(
      <AppProvider>
        <AppRouter />
      </AppProvider>,
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: /not found/i }),
    ).toBeInTheDocument();
  });
});
