import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { renderWithProvider } from '@/testing/setup';

import { SiteNavigation } from '../site-navigation';

describe('SiteNavigation', () => {
  it('renders the primary links plus the account and menu triggers', () => {
    renderWithProvider(
      <MemoryRouter>
        <SiteNavigation />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('navigation', { name: 'Primary' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Account menu' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open menu' }),
    ).toBeInTheDocument();
  });
});
