import { screen } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { apiClient } from '@/lib/api-client';
import { renderWithProvider } from '@/testing/setup';

import { VerifyEmailPanel } from '../verify-email-panel';

const mock = new MockAdapter(apiClient);

function renderVerifyEmailPanel(
  initialEntry = '/verify-email?token=verify-token',
) {
  return renderWithProvider(
    <MemoryRouter initialEntries={[initialEntry]}>
      <VerifyEmailPanel />
    </MemoryRouter>,
  );
}

describe('VerifyEmailPanel', () => {
  afterEach(() => {
    mock.reset();
  });

  it('shows an invalid-link message and makes no request without a token', () => {
    renderVerifyEmailPanel('/verify-email');
    expect(
      screen.getByText(/this verification link is invalid/i),
    ).toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
  });

  it('verifies the token on mount and confirms success', async () => {
    mock.onPost('/v1/auth/verify-email').reply(204);
    renderVerifyEmailPanel();

    expect(
      await screen.findByText('Your email is verified.'),
    ).toBeInTheDocument();
    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({
      token: 'verify-token',
    });
  });

  it('shows an error when the token is invalid', async () => {
    mock.onPost('/v1/auth/verify-email').reply(400, {
      status: 400,
      errorCode: 'INVALID_TOKEN',
      developerMessage: 'Token is invalid.',
      userMessage: 'This link is invalid or has expired.',
      moreInfo: '',
    });
    renderVerifyEmailPanel();

    expect(
      await screen.findByText(
        /this verification link is invalid or has expired/i,
      ),
    ).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    mock.onPost('/v1/auth/verify-email').reply(204);
    const { container } = renderVerifyEmailPanel();
    await screen.findByText('Your email is verified.');
    expect(await axe(container)).toHaveNoViolations();
  });
});
