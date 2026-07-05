import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { MemoryRouter } from 'react-router-dom';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from 'vitest';
import { axe } from 'vitest-axe';

import { apiClient } from '@/lib/api-client';
import { renderWithProvider } from '@/testing/setup';

import { AccountDangerZone } from '../account-danger-zone';

const mock = new MockAdapter(apiClient);

let createObjectURL: Mock<(obj: Blob | MediaSource) => string>;

function renderDangerZone() {
  document.cookie = 'dm_csrf=token';
  return renderWithProvider(
    <MemoryRouter>
      <AccountDangerZone />
    </MemoryRouter>,
  );
}

async function openDeleteDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Delete account' }));
  return within(await screen.findByRole('alertdialog'));
}

describe('AccountDangerZone', () => {
  beforeEach(() => {
    // jsdom implements neither of these; the export handler needs both.
    createObjectURL = vi.fn<(obj: Blob | MediaSource) => string>(
      () => 'blob:mock',
    );
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn<(url: string) => void>(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined,
    );
  });

  afterEach(() => {
    mock.reset();
    vi.restoreAllMocks();
    document.cookie = 'dm_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('downloads the export when Export my data is clicked', async () => {
    const user = userEvent.setup();
    mock.onGet('/v1/account/export').reply(200, {
      exportedAt: '2026-01-01T00:00:00Z',
      account: {},
      books: [],
    });
    renderDangerZone();

    await user.click(screen.getByRole('button', { name: 'Export my data' }));

    await waitFor(() => {
      expect(
        mock.history.get.some((req) => req.url === '/v1/account/export'),
      ).toBe(true);
    });
    expect(createObjectURL).toHaveBeenCalledOnce();
  });

  it('deletes the account with the confirmed password', async () => {
    const user = userEvent.setup();
    mock.onDelete('/v1/account').reply(204);
    renderDangerZone();

    const dialog = await openDeleteDialog(user);
    await user.type(dialog.getByLabelText('Current password'), 'hunter2');
    await user.click(dialog.getByRole('button', { name: 'Delete account' }));

    await waitFor(() => {
      const request = mock.history.delete.find(
        (req) => req.url === '/v1/account',
      );
      expect(request).toBeDefined();
      expect(JSON.parse(request?.data as string)).toEqual({
        password: 'hunter2',
      });
    });
  });

  it('shows an inline error and stays open on a wrong password', async () => {
    const user = userEvent.setup();
    mock.onDelete('/v1/account').reply(403, {
      status: 403,
      errorCode: 'INVALID_PASSWORD',
      developerMessage: 'Re-authentication password is incorrect.',
      userMessage: 'That password is incorrect.',
      moreInfo: '',
    });
    renderDangerZone();

    const dialog = await openDeleteDialog(user);
    await user.type(dialog.getByLabelText('Current password'), 'wrong');
    await user.click(dialog.getByRole('button', { name: 'Delete account' }));

    expect(
      await screen.findByText('That password is incorrect.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('has no accessibility violations with the dialog open', async () => {
    const user = userEvent.setup();
    const { baseElement } = renderDangerZone();

    await openDeleteDialog(user);

    expect(await axe(baseElement)).toHaveNoViolations();
  });
});
