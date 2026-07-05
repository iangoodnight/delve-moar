import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { apiClient } from '@/lib/api-client';
import { renderWithProvider } from '@/testing/setup';

import { LoginForm } from '../login-form';

const mock = new MockAdapter(apiClient);

const USER = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'mara',
  email: 'mara@example.com',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
};

function renderLoginForm() {
  return renderWithProvider(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>,
  );
}

describe('LoginForm', () => {
  afterEach(() => {
    mock.reset();
    document.cookie = 'dm_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('renders the identifier and password fields', () => {
    renderLoginForm();
    expect(screen.getByLabelText('Username or email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('blocks submission and shows validation errors when empty', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(
      await screen.findByText('Enter your username or email.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
  });

  it('posts the credentials to the API', async () => {
    const user = userEvent.setup();
    mock.onPost('/v1/auth/login').reply(200, USER);
    renderLoginForm();

    await user.type(screen.getByLabelText('Username or email'), 'mara');
    await user.type(screen.getByLabelText('Password'), 'correct horse');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => {
      expect(mock.history.post).toHaveLength(1);
    });
    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({
      identifier: 'mara',
      password: 'correct horse',
    });
  });

  it('shows a form-level error when the API rejects the credentials', async () => {
    const user = userEvent.setup();
    mock.onPost('/v1/auth/login').reply(401, {
      status: 401,
      errorCode: 'INVALID_CREDENTIALS',
      developerMessage: 'Identifier or password is incorrect.',
      userMessage: 'Invalid username/email or password.',
      moreInfo: '',
    });
    renderLoginForm();

    await user.type(screen.getByLabelText('Username or email'), 'mara');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(
      await screen.findByText('Invalid username/email or password.'),
    ).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderLoginForm();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
