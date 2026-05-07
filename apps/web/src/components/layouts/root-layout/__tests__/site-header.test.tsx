import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import type * as ReactRouter from 'react-router-dom';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

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
    render(
      <Theme>
        <MemoryRouter>
          <SiteHeader />
        </MemoryRouter>
      </Theme>,
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
});
