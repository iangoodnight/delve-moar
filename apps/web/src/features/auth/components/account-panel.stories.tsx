import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { AccountPanel } from './account-panel';
import { authMock, DEMO_USER, withAuthProviders } from './auth-story-helpers';

const meta: Meta<typeof AccountPanel> = {
  title: 'Features/Auth/AccountPanel',
  component: AccountPanel,
  decorators: [withAuthProviders],
  beforeEach: () => {
    // The readable cookie lets the auth context hydrate from /me.
    authMock.reset();
    document.cookie = 'dm_csrf=demo';
    return () => {
      authMock.reset();
      document.cookie = 'dm_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    };
  },
};

export default meta;

type Story = StoryObj<typeof AccountPanel>;

export const Verified: Story = {
  beforeEach: () => {
    authMock
      .onGet('/v1/auth/me')
      .reply(200, { ...DEMO_USER, emailVerified: true });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('mara')).toBeInTheDocument();
  },
};

export const Unverified: Story = {
  beforeEach: () => {
    authMock
      .onGet('/v1/auth/me')
      .reply(200, { ...DEMO_USER, emailVerified: false });
    authMock.onPost('/v1/auth/resend-verification').reply(204);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Unverified')).toBeInTheDocument();
  },
};
