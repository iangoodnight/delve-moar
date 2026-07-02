import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { BookContentRow } from '../book-content-row';

function renderRow() {
  return render(
    <Theme>
      <MemoryRouter>
        <BookContentRow href="/monsters/goblin" meta="CR 1/4" name="Goblin" />
      </MemoryRouter>
    </Theme>,
  );
}

describe('BookContentRow', () => {
  it('links the name to the content detail', () => {
    renderRow();
    expect(screen.getByRole('link', { name: 'Goblin' })).toHaveAttribute(
      'href',
      '/monsters/goblin',
    );
  });

  it('shows the metadatum', () => {
    renderRow();
    expect(screen.getByText('CR 1/4')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderRow();
    expect(await axe(container)).toHaveNoViolations();
  });
});
