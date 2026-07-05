import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { apiClient } from '@/lib/api-client';
import { renderWithProvider } from '@/testing/setup';

import { ForgotPasswordForm } from '../forgot-password-form';

const mock = new MockAdapter(apiClient);

function renderForgotPasswordForm() {
  return renderWithProvider(
    <MemoryRouter>
      <ForgotPasswordForm />
    </MemoryRouter>,
  );
}

describe('ForgotPasswordForm', () => {
  afterEach(() => {
    mock.reset();
  });

  it('renders the identifier field', () => {
    renderForgotPasswordForm();
    expect(screen.getByLabelText('Username or email')).toBeInTheDocument();
  });

  it('submits the identifier and shows the generic confirmation', async () => {
    const user = userEvent.setup();
    const message = 'If that account exists, a reset link is on its way.';
    mock.onPost('/v1/auth/password-reset').reply(202, { message });
    renderForgotPasswordForm();

    await user.type(
      screen.getByLabelText('Username or email'),
      'mara@example.com',
    );
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({
      identifier: 'mara@example.com',
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderForgotPasswordForm();
    expect(await axe(container)).toHaveNoViolations();
  });
});
