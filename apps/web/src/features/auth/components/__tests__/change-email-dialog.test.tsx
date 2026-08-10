import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { renderWithProvider } from '@/testing/setup';

import { ChangeEmailDialog } from '../change-email-dialog';

const mock = new MockAdapter(apiClient);

const USER = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'mara',
  email: 'mara@example.com',
  pendingEmail: 'new@example.com',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
};

function renderDialog() {
  return renderWithProvider(
    <MemoryRouter>
      <ChangeEmailDialog>
        <Button>Change email</Button>
      </ChangeEmailDialog>
    </MemoryRouter>,
  );
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Change email' }));
  return within(await screen.findByRole('dialog'));
}

describe('ChangeEmailDialog', () => {
  afterEach(() => {
    mock.reset();
  });

  it('submits the new email and closes on success', async () => {
    const user = userEvent.setup();
    mock.onPut('/v1/account/email').reply(200, USER);
    renderDialog();

    const dialog = await openDialog(user);
    await user.type(dialog.getByLabelText('New email'), 'new@example.com');
    await user.type(dialog.getByLabelText('Current password'), 'oldpassword');
    await user.click(
      dialog.getByRole('button', { name: 'Send confirmation link' }),
    );

    await waitFor(() => {
      const request = mock.history.put.find(
        (req) => req.url === '/v1/account/email',
      );
      expect(request).toBeDefined();
      expect(JSON.parse(request?.data as string)).toEqual({
        newEmail: 'new@example.com',
        currentPassword: 'oldpassword',
      });
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('shows an inline error when the address is already taken', async () => {
    const user = userEvent.setup();
    mock.onPut('/v1/account/email').reply(409, {
      status: 409,
      errorCode: 'EMAIL_TAKEN',
      developerMessage: "Email 'taken@example.com' is already registered.",
      userMessage: 'That email is already registered.',
      moreInfo: '',
    });
    renderDialog();

    const dialog = await openDialog(user);
    await user.type(dialog.getByLabelText('New email'), 'taken@example.com');
    await user.type(dialog.getByLabelText('Current password'), 'oldpassword');
    await user.click(
      dialog.getByRole('button', { name: 'Send confirmation link' }),
    );

    expect(
      await screen.findByText('That email is already registered.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('has no accessibility violations with the dialog open', async () => {
    const user = userEvent.setup();
    const { baseElement } = renderDialog();
    await openDialog(user);
    expect(await axe(baseElement)).toHaveNoViolations();
  });
});
