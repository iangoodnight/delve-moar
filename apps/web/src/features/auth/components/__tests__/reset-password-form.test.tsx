import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { apiClient } from '@/lib/api-client';
import { renderWithProvider } from '@/testing/setup';

import { ResetPasswordForm } from '../reset-password-form';

const mock = new MockAdapter(apiClient);

function renderResetPasswordForm(
  initialEntry = '/reset-password?token=reset-token',
) {
  return renderWithProvider(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ResetPasswordForm />
    </MemoryRouter>,
  );
}

describe('ResetPasswordForm', () => {
  afterEach(() => {
    mock.reset();
  });

  it('shows an invalid-link message when there is no token', () => {
    renderResetPasswordForm('/reset-password');
    expect(
      screen.getByText(/this password reset link is invalid/i),
    ).toBeInTheDocument();
  });

  it('submits the token and new password, then confirms success', async () => {
    const user = userEvent.setup();
    mock.onPost('/v1/auth/password-reset/confirm').reply(204);
    renderResetPasswordForm();

    await user.type(screen.getByLabelText('New password'), 'brand new pw');
    await user.type(
      screen.getByLabelText('Confirm new password'),
      'brand new pw',
    );
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(
      await screen.findByText(/your password has been reset/i),
    ).toBeInTheDocument();
    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({
      token: 'reset-token',
      password: 'brand new pw',
    });
  });

  it('shows an error when the token is rejected', async () => {
    const user = userEvent.setup();
    mock.onPost('/v1/auth/password-reset/confirm').reply(400, {
      status: 400,
      errorCode: 'INVALID_TOKEN',
      developerMessage: 'Token is invalid.',
      userMessage:
        'This link is invalid or has expired. Please request a new one.',
      moreInfo: '',
    });
    renderResetPasswordForm();

    await user.type(screen.getByLabelText('New password'), 'brand new pw');
    await user.type(
      screen.getByLabelText('Confirm new password'),
      'brand new pw',
    );
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(
      await screen.findByText(/this link is invalid or has expired/i),
    ).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderResetPasswordForm();
    expect(await axe(container)).toHaveNoViolations();
  });
});
