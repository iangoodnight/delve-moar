import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import MonsterDetail from '../monster-detail';

function renderDetail(slug: string) {
  return render(
    <HelmetProvider>
      <Theme>
        <MemoryRouter initialEntries={[`/monsters/${slug}`]}>
          <Routes>
            <Route element={<MonsterDetail />} path="/monsters/:slug" />
          </Routes>
        </MemoryRouter>
      </Theme>
    </HelmetProvider>,
  );
}

describe('MonsterDetail route', () => {
  it('reads the slug from the URL and renders it in the heading', () => {
    renderDetail('tarrasque');
    expect(
      screen.getByRole('heading', { level: 1, name: /tarrasque/i }),
    ).toBeInTheDocument();
  });

  it('links back to the monsters list', () => {
    renderDetail('tarrasque');
    expect(
      screen.getByRole('link', { name: /back to monsters/i }),
    ).toHaveAttribute('href', '/monsters');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderDetail('tarrasque');
    expect(await axe(container)).toHaveNoViolations();
  });
});
