import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { BookContentRow } from '../book-content-row';

function renderRow(onRemove?: () => void) {
  return render(
    <Theme>
      <MemoryRouter>
        <BookContentRow
          badges={[{ label: 'Humanoid' }, { label: 'CR 1/4' }]}
          href="/monsters/goblin"
          name="Goblin"
          {...(onRemove && { onRemove })}
        />
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

  it('shows the secondary fields as badges', () => {
    renderRow();
    expect(screen.getByText('Humanoid')).toBeInTheDocument();
    expect(screen.getByText('CR 1/4')).toBeInTheDocument();
  });

  it('has no remove button without an onRemove handler', () => {
    renderRow();
    expect(
      screen.queryByRole('button', { name: /remove/i }),
    ).not.toBeInTheDocument();
  });

  it('calls onRemove when the remove button is clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderRow(onRemove);

    await user.click(
      screen.getByRole('button', { name: /remove goblin from this book/i }),
    );
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    const { container } = renderRow();
    expect(await axe(container)).toHaveNoViolations();
  });
});
