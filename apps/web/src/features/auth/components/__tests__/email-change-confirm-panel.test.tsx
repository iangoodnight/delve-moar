import { screen } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { apiClient } from '@/lib/api-client';
import { renderWithProvider } from '@/testing/setup';

import { EmailChangeConfirmPanel } from '../email-change-confirm-panel';

const mock = new MockAdapter(apiClient);

function renderPanel(initialEntry: string) {
  return renderWithProvider(
    <MemoryRouter initialEntries={[initialEntry]}>
      <EmailChangeConfirmPanel />
    </MemoryRouter>,
  );
}

describe('EmailChangeConfirmPanel', () => {
  afterEach(() => {
    mock.reset();
  });

  it('confirms the change with the token from the URL', async () => {
    mock.onPost('/v1/auth/email-change/confirm').reply(204);
    renderPanel('/confirm-email-change?token=good-token');

    expect(
      await screen.findByText('Your email address has been updated.'),
    ).toBeInTheDocument();
    const request = mock.history.post.find(
      (req) => req.url === '/v1/auth/email-change/confirm',
    );
    expect(JSON.parse(request?.data as string)).toEqual({
      token: 'good-token',
    });
  });

  it('shows an invalid state when the token is rejected', async () => {
    mock.onPost('/v1/auth/email-change/confirm').reply(400, {
      status: 400,
      errorCode: 'INVALID_TOKEN',
      developerMessage: 'Email token is invalid, expired, or already used.',
      userMessage: 'This link is invalid or has expired.',
      moreInfo: '',
    });
    renderPanel('/confirm-email-change?token=bad-token');

    expect(
      await screen.findByText(/this link is invalid or has expired/i),
    ).toBeInTheDocument();
  });

  it('shows an invalid state when no token is present', () => {
    renderPanel('/confirm-email-change');
    expect(
      screen.getByText('This email-change link is invalid.'),
    ).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    mock.onPost('/v1/auth/email-change/confirm').reply(204);
    const { container } = renderPanel('/confirm-email-change?token=good-token');
    await screen.findByText('Your email address has been updated.');
    expect(await axe(container)).toHaveNoViolations();
  });
});
