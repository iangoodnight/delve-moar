import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import {
  authMock,
  pendingForever,
  withAuthProviders,
} from './auth-story-helpers';
import { VerifyEmailPanel } from './verify-email-panel';

const meta: Meta<typeof VerifyEmailPanel> = {
  title: 'Features/Auth/VerifyEmailPanel',
  component: VerifyEmailPanel,
  parameters: {
    router: { initialEntries: ['/verify-email?token=demo-token'] },
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

type Story = StoryObj<typeof VerifyEmailPanel>;

// Auto-submits on mount; the request never settles, so it stays "verifying".
export const Verifying: Story = {
  beforeEach: () => {
    authMock.onPost('/v1/auth/verify-email').reply(pendingForever);
  },
};

export const Verified: Story = {
  beforeEach: () => {
    authMock.onPost('/v1/auth/verify-email').reply(204);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText('Your email is verified.'),
    ).toBeInTheDocument();
  },
};

export const Invalid: Story = {
  beforeEach: () => {
    authMock.onPost('/v1/auth/verify-email').reply(400, {
      status: 400,
      errorCode: 'INVALID_TOKEN',
      developerMessage: 'Token is invalid.',
      userMessage: 'This link is invalid or has expired.',
      moreInfo: '',
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(
        /this verification link is invalid or has expired/i,
      ),
    ).toBeInTheDocument();
  },
};

// No token in the URL: renders the invalid-link state without a request.
export const NoToken: Story = {
  parameters: { router: { initialEntries: ['/verify-email'] } },
};
