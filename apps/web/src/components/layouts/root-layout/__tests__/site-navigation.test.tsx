import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { SiteNavigation } from '../site-navigation';

describe('SiteNavigation', () => {
  it('renders both desktop and mobile nav surfaces', () => {
    render(
      <Theme>
        <MemoryRouter>
          <SiteNavigation />
        </MemoryRouter>
      </Theme>,
    );

    expect(
      screen.getByRole('navigation', { name: 'Primary' }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    ).toBeInTheDocument();
  });
});
