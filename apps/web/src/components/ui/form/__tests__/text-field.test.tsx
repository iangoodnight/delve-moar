import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { renderWithProvider } from '@/testing/setup';

import { TextField } from '../text-field';

describe('TextField', () => {
  it('renders a non-password field without a visibility toggle', () => {
    renderWithProvider(<TextField label="Email" type="email" />);

    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(
      screen.queryByRole('button', { name: /password/i }),
    ).not.toBeInTheDocument();
  });

  it('toggles password visibility on a password field', async () => {
    const user = userEvent.setup();
    renderWithProvider(<TextField label="Password" type="password" />);
    const input = screen.getByLabelText('Password');

    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('has no accessibility violations for a password field', async () => {
    const { container } = renderWithProvider(
      <TextField label="Password" type="password" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
