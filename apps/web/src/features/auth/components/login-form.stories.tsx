import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import {
  authMock,
  pendingForever,
  withAuthProviders,
} from './auth-story-helpers';
import { LoginForm } from './login-form';

const meta: Meta<typeof LoginForm> = {
  title: 'Features/Auth/LoginForm',
  component: LoginForm,
  decorators: [withAuthProviders],
  beforeEach: () => {
    authMock.reset();
    return () => {
      authMock.reset();
    };
  },
};

export default meta;

type Story = StoryObj<typeof LoginForm>;

export const Default: Story = {};

export const Submitting: Story = {
  beforeEach: () => {
    authMock.onPost('/v1/auth/login').reply(pendingForever);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Username or email'), 'mara');
    await userEvent.type(canvas.getByLabelText('Password'), 'correct horse');
    await userEvent.click(canvas.getByRole('button', { name: 'Log in' }));
  },
};

export const WithFormError: Story = {
  beforeEach: () => {
    authMock.onPost('/v1/auth/login').reply(401, {
      status: 401,
      errorCode: 'INVALID_CREDENTIALS',
      developerMessage: 'Identifier or password is incorrect.',
      userMessage: 'Invalid username/email or password.',
      moreInfo: '',
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Username or email'), 'mara');
    await userEvent.type(canvas.getByLabelText('Password'), 'wrong password');
    await userEvent.click(canvas.getByRole('button', { name: 'Log in' }));
    await expect(
      await canvas.findByText('Invalid username/email or password.'),
    ).toBeInTheDocument();
  },
};
