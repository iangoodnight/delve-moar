import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Button } from '@/components/ui/button';

import { authMock, withAuthProviders } from './auth-story-helpers';
import { ChangeEmailDialog } from './change-email-dialog';

const meta: Meta<typeof ChangeEmailDialog> = {
  title: 'Features/Auth/ChangeEmailDialog',
  component: ChangeEmailDialog,
  decorators: [withAuthProviders],
  beforeEach: () => {
    return () => {
      authMock.reset();
    };
  },
};

export default meta;

type Story = StoryObj<typeof ChangeEmailDialog>;

export const Default: Story = {
  render: () => (
    <ChangeEmailDialog>
      <Button>Change email</Button>
    </ChangeEmailDialog>
  ),
};

export const Open: Story = {
  render: () => (
    <ChangeEmailDialog>
      <Button>Change email</Button>
    </ChangeEmailDialog>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Change email' }));
    // The dialog portals to document.body, outside the story canvas.
    const dialog = within(await within(document.body).findByRole('dialog'));
    await expect(dialog.getByLabelText('New email')).toBeInTheDocument();
  },
};
