import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { LINKS } from '../links';
import { MobileNavigation } from '../mobile-navigation';

function renderAt(path: string) {
  return render(
    <Theme>
      <MemoryRouter initialEntries={[path]}>
        <MobileNavigation />
      </MemoryRouter>
    </Theme>,
  );
}

describe('MobileNavigation', () => {
  it('renders the trigger with an accessible label', () => {
    renderAt('/');

    expect(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    ).toBeInTheDocument();
  });

  it('hides the menu content until the trigger is activated', () => {
    renderAt('/');

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('opens the popover and reveals every nav link on trigger click', async () => {
    const user = userEvent.setup();
    renderAt('/');

    await user.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    );

    const nav = await screen.findByRole('navigation', { name: 'Primary' });

    for (const { to, label } of LINKS) {
      const link = within(nav).getByRole('link', { name: label });
      expect(link).toHaveAttribute('href', to);
    }
  });

  it('marks the link matching the current pathname with aria-current="page"', async () => {
    const user = userEvent.setup();
    renderAt('/monsters');

    await user.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    );

    const nav = await screen.findByRole('navigation', { name: 'Primary' });
    expect(within(nav).getByRole('link', { name: 'Monsters' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
