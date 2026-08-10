import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { authMock, withAuthProviders } from './auth-story-helpers';
import { EmailChangeConfirmPanel } from './email-change-confirm-panel';

const meta: Meta<typeof EmailChangeConfirmPanel> = {
  title: 'Features/Auth/EmailChangeConfirmPanel',
  component: EmailChangeConfirmPanel,
  parameters: {
    router: { initialEntries: ['/confirm-email-change?token=demo-token'] },
  },
  decorators: [withAuthProviders],
  beforeEach: () => {
    return () => {
      authMock.reset();
    };
  },
};

export default meta;

type Story = StoryObj<typeof EmailChangeConfirmPanel>;

export const Confirmed: Story = {
  beforeEach: () => {
    authMock.onPost('/v1/auth/email-change/confirm').reply(204);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText('Your email address has been updated.'),
    ).toBeInTheDocument();
  },
};

export const InvalidToken: Story = {
  beforeEach: () => {
    authMock.onPost('/v1/auth/email-change/confirm').reply(400, {
      status: 400,
      errorCode: 'INVALID_TOKEN',
      developerMessage: 'Email token is invalid, expired, or already used.',
      userMessage: 'This link is invalid or has expired.',
      moreInfo: '',
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(/this link is invalid or has expired/i),
    ).toBeInTheDocument();
  },
};

export const NoToken: Story = {
  parameters: { router: { initialEntries: ['/confirm-email-change'] } },
};
