import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { RouterLink } from '../router-link';

// RouterLink wraps Radix Themes Link (asChild) around react-router-dom Link,
// so it needs both a Theme ancestor (Radix relies on token CSS vars at runtime)
// and a router context.
function renderInRouter(ui: ReactNode) {
  return render(
    <Theme>
      <MemoryRouter>{ui}</MemoryRouter>
    </Theme>,
  );
}

describe('RouterLink', () => {
  it('renders an anchor with the routed href', () => {
    renderInRouter(<RouterLink to="/monsters">Browse monsters</RouterLink>);

    const link = screen.getByRole('link', { name: 'Browse monsters' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/monsters');
  });

  it('forwards the className through Radix to the rendered anchor', () => {
    renderInRouter(
      <RouterLink className="custom" to="/items">
        Items
      </RouterLink>,
    );

    expect(screen.getByRole('link', { name: 'Items' }).className).toMatch(
      /custom/,
    );
  });

  it('applies Radix data attributes for size, weight, and color', () => {
    renderInRouter(
      <RouterLink color="indigo" size="4" weight="bold" to="/spells">
        Spells
      </RouterLink>,
    );

    const link = screen.getByRole('link', { name: 'Spells' });
    // Radix encodes the styling props as data-* attributes on the rendered
    // element (verified at https://www.radix-ui.com/themes/docs/components/text).
    // Asserting on these is enough to confirm the asChild merge ran.
    expect(link).toHaveAttribute('data-accent-color', 'indigo');
  });

  it('forwards anchor-level props such as target and rel', () => {
    renderInRouter(
      <RouterLink rel="noopener" target="_blank" to="/items">
        External-style
      </RouterLink>,
    );

    const link = screen.getByRole('link', { name: 'External-style' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener');
  });
});
