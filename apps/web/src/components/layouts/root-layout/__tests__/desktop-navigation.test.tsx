import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { DesktopNavigation } from '../desktop-navigation';
import { LINKS } from '../links';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DesktopNavigation />
    </MemoryRouter>,
  );
}

describe('DesktopNavigation', () => {
  it('renders a nav landmark labeled "Primary"', () => {
    renderAt('/');

    expect(
      screen.getByRole('navigation', { name: 'Primary' }),
    ).toBeInTheDocument();
  });

  it('renders every link in the LINKS array', () => {
    renderAt('/');

    const nav = screen.getByRole('navigation', { name: 'Primary' });

    for (const { to, label } of LINKS) {
      const link = within(nav).getByRole('link', { name: label });
      expect(link).toHaveAttribute('href', to);
    }
  });

  it('marks the link matching the current pathname with aria-current="page"', () => {
    renderAt('/spells');

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(nav).getByRole('link', { name: 'Spells' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      within(nav).getByRole('link', { name: 'Monsters' }),
    ).not.toHaveAttribute('aria-current');
  });
});
