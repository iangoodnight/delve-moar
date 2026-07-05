import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import {
  authMock,
  pendingForever,
  withAuthProviders,
} from './auth-story-helpers';
import { ResetPasswordForm } from './reset-password-form';

async function fillReset(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.type(canvas.getByLabelText('New password'), 'brand new pw');
  await userEvent.type(
    canvas.getByLabelText('Confirm new password'),
    'brand new pw',
  );
  return canvas;
}

const meta: Meta<typeof ResetPasswordForm> = {
  title: 'Features/Auth/ResetPasswordForm',
  component: ResetPasswordForm,
  parameters: {
    router: { initialEntries: ['/reset-password?token=demo-token'] },
  },
  decorators: [withAuthProviders],
  beforeEach: () => {
    authMock.reset();
    return () => {
      authMock.reset();
    };
  },
};

export default meta;

type Story = StoryObj<typeof ResetPasswordForm>;

export const Default: Story = {};

// No token in the URL: the form renders its invalid-link state instead.
export const InvalidLink: Story = {
  parameters: { router: { initialEntries: ['/reset-password'] } },
};

export const Submitted: Story = {
  beforeEach: () => {
    authMock.onPost('/v1/auth/password-reset/confirm').reply(204);
  },
  play: async ({ canvasElement }) => {
    const canvas = await fillReset(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Reset password' }),
    );
    await expect(
      await canvas.findByText(/your password has been reset/i),
    ).toBeInTheDocument();
  },
};

export const Submitting: Story = {
  beforeEach: () => {
    authMock.onPost('/v1/auth/password-reset/confirm').reply(pendingForever);
  },
  play: async ({ canvasElement }) => {
    const canvas = await fillReset(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Reset password' }),
    );
  },
};
