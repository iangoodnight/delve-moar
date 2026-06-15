import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import {
  authMock,
  pendingForever,
  withAuthProviders,
} from './auth-story-helpers';
import { ForgotPasswordForm } from './forgot-password-form';

const meta: Meta<typeof ForgotPasswordForm> = {
  title: 'Features/Auth/ForgotPasswordForm',
  component: ForgotPasswordForm,
  decorators: [withAuthProviders],
  beforeEach: () => {
    authMock.reset();
    return () => {
      authMock.reset();
    };
  },
};

export default meta;

type Story = StoryObj<typeof ForgotPasswordForm>;

export const Default: Story = {};

export const Submitted: Story = {
  beforeEach: () => {
    authMock.onPost('/v1/auth/password-reset').reply(202, {
      message: 'If that account exists, a reset link is on its way.',
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByLabelText('Username or email'),
      'mara@example.com',
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Send reset link' }),
    );
    await expect(
      await canvas.findByText(/reset link is on its way/i),
    ).toBeInTheDocument();
  },
};

export const Submitting: Story = {
  beforeEach: () => {
    authMock.onPost('/v1/auth/password-reset').reply(pendingForever);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByLabelText('Username or email'),
      'mara@example.com',
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Send reset link' }),
    );
  },
};
