import { screen, within } from '@testing-library/react';
import type * as ReactRouter from 'react-router-dom';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProvider } from '@/testing/setup';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouter>('react-router-dom');
  return {
    ...actual,
    useNavigation: () => ({ state: 'idle' }),
  };
});

const { SiteHeader } = await import('../site-header');

describe('SiteHeader', () => {
  it('renders a banner landmark with the brand mark and primary nav', () => {
    renderWithProvider(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>,
    );

    const banner = screen.getByRole('banner');
    expect(banner).toBeInTheDocument();

    expect(
      within(banner).getByRole('link', { name: /delvemoar.*home/i }),
    ).toBeInTheDocument();

    expect(
      within(banner).getByRole('navigation', { name: 'Primary' }),
    ).toBeInTheDocument();
  });

  it('shows sign-in links when anonymous', () => {
    renderWithProvider(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>,
    );

    const banner = screen.getByRole('banner');
    expect(
      within(banner).getByRole('link', { name: 'Log in' }),
    ).toBeInTheDocument();
    expect(
      within(banner).getByRole('link', { name: 'Sign up' }),
    ).toBeInTheDocument();
  });
});
