import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { PrefetchRegistry } from '@/lib/prefetch';
import { PrefetchRegistryProvider } from '@/lib/prefetch';
import { createTestQueryClient } from '@/testing/setup';

import { DesktopLink } from '../desktop-link';

function renderInNavMenu(
  ui: ReactNode,
  initialPath = '/',
  registry: PrefetchRegistry = {},
) {
  const queryClient = createTestQueryClient();
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <PrefetchRegistryProvider registry={registry}>
          <MemoryRouter initialEntries={[initialPath]}>
            <NavigationMenu.Root>
              <NavigationMenu.List>
                <NavigationMenu.Item>{ui}</NavigationMenu.Item>
              </NavigationMenu.List>
            </NavigationMenu.Root>
          </MemoryRouter>
        </PrefetchRegistryProvider>
      </QueryClientProvider>,
    ),
  };
}

describe('DesktopLink', () => {
  it('renders an anchor with the correct href and label', () => {
    renderInNavMenu(<DesktopLink to="/monsters">Monsters</DesktopLink>);

    const link = screen.getByRole('link', { name: 'Monsters' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/monsters');
  });

  it('marks the link as current when the pathname matches `to`', () => {
    renderInNavMenu(
      <DesktopLink to="/monsters">Monsters</DesktopLink>,
      '/monsters',
    );

    expect(screen.getByRole('link', { name: 'Monsters' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('does not set aria-current when the pathname does not match', () => {
    renderInNavMenu(
      <DesktopLink to="/monsters">Monsters</DesktopLink>,
      '/items',
    );

    expect(screen.getByRole('link', { name: 'Monsters' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('merges a consumer-supplied className with the base style', () => {
    renderInNavMenu(
      <DesktopLink className="custom" to="/items">
        Items
      </DesktopLink>,
    );

    const link = screen.getByRole('link', { name: 'Items' });
    expect(link.className).toMatch(/custom/);
    expect(link.className).toMatch(/desktop-link/);
  });

  it('warms a registered path on pointer enter', async () => {
    const prefetch = vi.fn();
    const { queryClient } = renderInNavMenu(
      <DesktopLink to="/monsters">Monsters</DesktopLink>,
      '/',
      { '/monsters': prefetch },
    );

    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Monsters' }));

    await waitFor(() => {
      expect(prefetch).toHaveBeenCalledWith(queryClient);
    });
  });
});
