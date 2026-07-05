import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '@/components/ui/button';
import { Row } from '@/components/ui/layout';
import { notify } from '@/lib/notifications';

import { AppToaster } from './app-toaster';

const meta = {
  component: AppToaster,
  parameters: { layout: 'fullscreen' },
  title: 'Design System/Toaster',
} satisfies Meta<typeof AppToaster>;

export default meta;

type Story = StoryObj<typeof meta>;

// toggle the ThemePanel's appearance to preview light and dark
export const Overview: Story = {
  render: () => (
    <>
      <Row gap="3" p="5" wrap="wrap">
        <Button
          color="green"
          onClick={() => notify.success('Saved your changes.')}
        >
          Success
        </Button>
        <Button
          color="red"
          onClick={() => notify.error('Something went wrong.')}
        >
          Error
        </Button>
        <Button
          color="blue"
          onClick={() => notify.info('New content is available.')}
        >
          Info
        </Button>
        <Button
          color="amber"
          onClick={() => notify.warning('Double-check this one.')}
        >
          Warning
        </Button>
      </Row>
      <AppToaster />
    </>
  ),
};
