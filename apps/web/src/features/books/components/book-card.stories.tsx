import type { Meta, StoryObj } from '@storybook/react-vite';

import { Column } from '@/components/ui/layout';

import type { BookSummary } from '../api/get-books';

import { AddBookCard } from './add-book-card';
import { BookCard } from './book-card';
import { DEMO_BOOK, withQueryClient } from './book-story-helpers';

const meta: Meta<typeof BookCard> = {
  title: 'Features/Books/BookCard',
  component: BookCard,
  parameters: {
    docs: {
      description: {
        component:
          'A single owned book in the My Books grid. The title links to the ' +
          'book detail; the corner buttons open the rename and delete ' +
          'dialogs (which is why the card needs a QueryClient in isolation).',
      },
    },
  },
  decorators: [
    withQueryClient,
    (Story) => (
      <Column gap="4" style={{ maxWidth: 360 }}>
        <Story />
      </Column>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof BookCard>;

const NO_DESCRIPTION: BookSummary = {
  ...DEMO_BOOK,
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Untitled draft',
  description: null,
};

const LONG: BookSummary = {
  ...DEMO_BOOK,
  id: '33333333-3333-3333-3333-333333333333',
  name: 'Homebrew monsters, traps, and treasure for the whole campaign arc',
  description:
    'A long description that runs past two lines so we can see the clamp ' +
    'hold the card height steady. Encounters, magic items, NPC stat blocks, ' +
    'and a few cursed surprises for the back half of the campaign.',
};

export const Default: Story = {
  args: { book: DEMO_BOOK },
};

export const NoDescription: Story = {
  args: { book: NO_DESCRIPTION },
};

export const LongContent: Story = {
  args: { book: LONG },
};

// Owned cards followed by the add-a-book affordance, as they stack in the grid.
export const WithAddCard: Story = {
  render: () => (
    <>
      <BookCard book={DEMO_BOOK} />
      <AddBookCard />
    </>
  ),
};
