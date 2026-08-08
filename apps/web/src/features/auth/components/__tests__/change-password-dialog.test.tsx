import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { renderWithProvider } from '@/testing/setup';

import { ChangePasswordDialog } from '../change-password-dialog';

const mock = new MockAdapter(apiClient);

function renderDialog() {
  return renderWithProvider(
    <MemoryRouter>
      <ChangePasswordDialog>
        <Button>Change password</Button>
      </ChangePasswordDialog>
    </MemoryRouter>,
  );
}

async function openDialog(
  user: ReturnType<typeof userEvent.setup>,
): Promise<HTMLElement> {
  await user.click(screen.getByRole('button', { name: 'Change password' }));
  return screen.findByRole('dialog');
}

async function fill(
  container: HTMLElement,
  user: ReturnType<typeof userEvent.setup>,
  current: string,
  next: string,
  confirm: string,
) {
  const dialog = within(container);
  await user.type(dialog.getByLabelText('Current password'), current);
  await user.type(dialog.getByLabelText('New password'), next);
  await user.type(dialog.getByLabelText('Confirm new password'), confirm);
}

describe('ChangePasswordDialog', () => {
  afterEach(() => {
    mock.reset();
  });

  it('submits the current and new password and closes on success', async () => {
    const user = userEvent.setup();
    mock.onPut('/v1/account/password').reply(204);
    renderDialog();

    const container = await openDialog(user);
    await fill(container, user, 'oldpassword', 'newpassword1', 'newpassword1');
    await user.click(
      within(container).getByRole('button', { name: 'Change password' }),
    );

    await waitFor(() => {
      const request = mock.history.put.find(
        (req) => req.url === '/v1/account/password',
      );
      expect(request).toBeDefined();
      expect(JSON.parse(request?.data as string)).toEqual({
        currentPassword: 'oldpassword',
        newPassword: 'newpassword1',
      });
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('shows an inline error on a wrong current password and stays open', async () => {
    const user = userEvent.setup();
    mock.onPut('/v1/account/password').reply(403, {
      status: 403,
      errorCode: 'INVALID_PASSWORD',
      developerMessage: 'Re-authentication password is incorrect.',
      userMessage: 'That password is incorrect.',
      moreInfo: '',
    });
    renderDialog();

    const container = await openDialog(user);
    await fill(container, user, 'wrong', 'newpassword1', 'newpassword1');
    await user.click(
      within(container).getByRole('button', { name: 'Change password' }),
    );

    expect(
      await screen.findByText('That password is incorrect.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('rejects mismatched new passwords without a request', async () => {
    const user = userEvent.setup();
    mock.onPut('/v1/account/password').reply(204);
    renderDialog();

    const container = await openDialog(user);
    await fill(container, user, 'oldpassword', 'newpassword1', 'different1');
    await user.click(
      within(container).getByRole('button', { name: 'Change password' }),
    );

    expect(
      await screen.findByText('Passwords do not match.'),
    ).toBeInTheDocument();
    expect(
      mock.history.put.some((req) => req.url === '/v1/account/password'),
    ).toBe(false);
  });

  it('has no accessibility violations with the dialog open', async () => {
    const user = userEvent.setup();
    const { baseElement } = renderDialog();
    await openDialog(user);
    expect(await axe(baseElement)).toHaveNoViolations();
  });
});
