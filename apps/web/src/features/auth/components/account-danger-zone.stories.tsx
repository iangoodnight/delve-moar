import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { AccountDangerZone } from './account-danger-zone';
import { authMock, withAuthProviders } from './auth-story-helpers';

const meta: Meta<typeof AccountDangerZone> = {
  title: 'Features/Auth/AccountDangerZone',
  component: AccountDangerZone,
  decorators: [withAuthProviders],
  beforeEach: () => {
    document.cookie = 'dm_csrf=demo';
    return () => {
      authMock.reset();
      document.cookie = 'dm_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    };
  },
};

export default meta;

type Story = StoryObj<typeof AccountDangerZone>;

export const Default: Story = {};

export const ConfirmingDeletion: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Delete account' }),
    );
    // The dialog portals to document.body, outside the story canvas.
    const dialog = within(
      await within(document.body).findByRole('alertdialog'),
    );
    await expect(dialog.getByLabelText('Current password')).toBeInTheDocument();
  },
};
