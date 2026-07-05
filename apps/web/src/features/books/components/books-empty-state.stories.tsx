import type { Meta, StoryObj } from '@storybook/react-vite';

import { Box } from '@/components/ui/layout';

import { withQueryClient } from './book-story-helpers';
import { BooksEmptyState } from './books-empty-state';

const meta: Meta<typeof BooksEmptyState> = {
  title: 'Features/Books/BooksEmptyState',
  component: BooksEmptyState,
  parameters: {
    docs: {
      description: {
        component:
          'Shown on My Books when the signed-in user owns no books. The CTA ' +
          'opens the same create dialog as the header button.',
      },
    },
  },
  decorators: [
    withQueryClient,
    (Story) => (
      <Box style={{ maxWidth: 640, width: '100%' }}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof BooksEmptyState>;

export const Default: Story = {};
