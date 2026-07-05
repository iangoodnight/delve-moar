import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { apiClient } from '@/lib/api-client';
import { renderWithProvider } from '@/testing/setup';

import { SignupForm } from '../signup-form';

const mock = new MockAdapter(apiClient);

function renderSignupForm() {
  return renderWithProvider(
    <MemoryRouter>
      <SignupForm />
    </MemoryRouter>,
  );
}

async function fillValidSignup(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Username'), 'mara');
  await user.type(screen.getByLabelText('Email'), 'mara@example.com');
  await user.type(screen.getByLabelText('Password'), 'correct horse');
  await user.type(screen.getByLabelText('Confirm password'), 'correct horse');
}

describe('SignupForm', () => {
  afterEach(() => {
    mock.reset();
    document.cookie = 'dm_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('shows a mismatch error when the passwords differ', async () => {
    const user = userEvent.setup();
    renderSignupForm();

    await user.type(screen.getByLabelText('Username'), 'mara');
    await user.type(screen.getByLabelText('Email'), 'mara@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct horse');
    await user.type(screen.getByLabelText('Confirm password'), 'different');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByText('Passwords do not match.'),
    ).toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
  });

  it('posts username, email, and password (not confirmPassword)', async () => {
    const user = userEvent.setup();
    mock.onPost('/v1/auth/signup').reply(201, {
      id: '1',
      username: 'mara',
      email: 'mara@example.com',
      emailVerified: false,
      createdAt: '2026-01-01T00:00:00Z',
    });
    renderSignupForm();

    await fillValidSignup(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(mock.history.post).toHaveLength(1);
    });
    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({
      username: 'mara',
      email: 'mara@example.com',
      password: 'correct horse',
    });
  });

  it('attaches a taken-username error to the username field', async () => {
    const user = userEvent.setup();
    mock.onPost('/v1/auth/signup').reply(409, {
      status: 409,
      errorCode: 'USERNAME_TAKEN',
      developerMessage: "Username 'mara' is already taken.",
      userMessage: 'That username is taken.',
      moreInfo: '',
    });
    renderSignupForm();

    await fillValidSignup(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByText('That username is taken.'),
    ).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderSignupForm();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
