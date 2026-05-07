import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import HomePage from './home-page';

// HomePage > Hero contains React Router <Link> components, so a router
// context is required even though we never navigate during the test.
function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  it('renders the main heading', () => {
    renderHomePage();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderHomePage();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
