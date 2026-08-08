import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Button } from '@/components/ui/button';

import { authMock, withAuthProviders } from './auth-story-helpers';
import { ChangePasswordDialog } from './change-password-dialog';

const meta: Meta<typeof ChangePasswordDialog> = {
  title: 'Features/Auth/ChangePasswordDialog',
  component: ChangePasswordDialog,
  decorators: [withAuthProviders],
  beforeEach: () => {
    return () => {
      authMock.reset();
    };
  },
};

export default meta;

type Story = StoryObj<typeof ChangePasswordDialog>;

export const Default: Story = {
  render: () => (
    <ChangePasswordDialog>
      <Button>Change password</Button>
    </ChangePasswordDialog>
  ),
};

export const Open: Story = {
  render: () => (
    <ChangePasswordDialog>
      <Button>Change password</Button>
    </ChangePasswordDialog>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Change password' }),
    );
    // The dialog portals to document.body, outside the story canvas.
    const dialog = within(await within(document.body).findByRole('dialog'));
    await expect(dialog.getByLabelText('Current password')).toBeInTheDocument();
  },
};
