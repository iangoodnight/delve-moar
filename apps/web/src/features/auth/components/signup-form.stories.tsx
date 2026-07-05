import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import {
  authMock,
  pendingForever,
  withAuthProviders,
} from './auth-story-helpers';
import { SignupForm } from './signup-form';

async function fillSignup(
  canvasElement: HTMLElement,
  confirmPassword = 'correct horse',
) {
  const canvas = within(canvasElement);
  await userEvent.type(canvas.getByLabelText('Username'), 'mara');
  await userEvent.type(canvas.getByLabelText('Email'), 'mara@example.com');
  await userEvent.type(canvas.getByLabelText('Password'), 'correct horse');
  await userEvent.type(
    canvas.getByLabelText('Confirm password'),
    confirmPassword,
  );
  return canvas;
}

const meta: Meta<typeof SignupForm> = {
  title: 'Features/Auth/SignupForm',
  component: SignupForm,
  decorators: [withAuthProviders],
  beforeEach: () => {
    authMock.reset();
    return () => {
      authMock.reset();
    };
  },
};

export default meta;

type Story = StoryObj<typeof SignupForm>;

export const Default: Story = {};

export const PasswordMismatch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await fillSignup(canvasElement, 'different');
    await userEvent.click(
      canvas.getByRole('button', { name: 'Create account' }),
    );
    await expect(
      await canvas.findByText('Passwords do not match.'),
    ).toBeInTheDocument();
  },
};

export const UsernameTaken: Story = {
  beforeEach: () => {
    authMock.onPost('/v1/auth/signup').reply(409, {
      status: 409,
      errorCode: 'USERNAME_TAKEN',
      developerMessage: "Username 'mara' is already taken.",
      userMessage: 'That username is taken.',
      moreInfo: '',
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = await fillSignup(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Create account' }),
    );
    await expect(
      await canvas.findByText('That username is taken.'),
    ).toBeInTheDocument();
  },
};

export const Submitting: Story = {
  beforeEach: () => {
    authMock.onPost('/v1/auth/signup').reply(pendingForever);
  },
  play: async ({ canvasElement }) => {
    const canvas = await fillSignup(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Create account' }),
    );
  },
};
