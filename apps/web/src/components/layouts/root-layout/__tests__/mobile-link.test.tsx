import { Popover, Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { MobileLink } from '../mobile-link';

function renderInPopover(ui: ReactNode, initialPath = '/') {
  return render(
    <Theme>
      <MemoryRouter initialEntries={[initialPath]}>
        <Popover.Root defaultOpen>
          <Popover.Trigger>
            <button type="button">trigger</button>
          </Popover.Trigger>
          <Popover.Content>{ui}</Popover.Content>
        </Popover.Root>
      </MemoryRouter>
    </Theme>,
  );
}

describe('MobileLink', () => {
  it('renders an anchor with the correct href and label', () => {
    renderInPopover(<MobileLink to="/items">Items</MobileLink>);

    const link = screen.getByRole('link', { name: 'Items' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/items');
  });

  it('marks the link as current when the pathname matches `to`', () => {
    renderInPopover(<MobileLink to="/items">Items</MobileLink>, '/items');

    expect(screen.getByRole('link', { name: 'Items' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('does not set aria-current when the pathname does not match', () => {
    renderInPopover(<MobileLink to="/items">Items</MobileLink>, '/spells');

    expect(screen.getByRole('link', { name: 'Items' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('merges a consumer-supplied className with the base style', () => {
    renderInPopover(
      <MobileLink className="custom" to="/spells">
        Spells
      </MobileLink>,
    );

    const link = screen.getByRole('link', { name: 'Spells' });
    expect(link.className).toMatch(/custom/);
    expect(link.className).toMatch(/mobile-link/);
  });
});
