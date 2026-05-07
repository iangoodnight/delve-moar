import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { DesktopLink } from '../desktop-link';

function renderInNavMenu(ui: ReactNode, initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <NavigationMenu.Root>
        <NavigationMenu.List>
          <NavigationMenu.Item>{ui}</NavigationMenu.Item>
        </NavigationMenu.List>
      </NavigationMenu.Root>
    </MemoryRouter>,
  );
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
});
