import type { Meta, StoryObj } from '@storybook/react-vite';

import { Column } from '@/components/ui/layout';

import { BookContentRow } from './book-content-row';

function noop() {
  /* no-op */
}

const meta: Meta<typeof BookContentRow> = {
  title: 'Features/Books/BookContentRow',
  component: BookContentRow,
  args: { onRemove: noop },
  parameters: {
    docs: {
      description: {
        component:
          'A single in-book content item: the name links to the content ' +
          'detail, with the two secondary sortable fields as badges and a ' +
          'remove-from-book action. Used in the book-detail tabs.',
      },
    },
  },
  decorators: [
    (Story) => (
      <Column gap="2" style={{ maxWidth: 480 }}>
        <Story />
      </Column>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof BookContentRow>;

export const Monster: Story = {
  args: {
    name: 'Adult Red Dragon',
    href: '/monsters/adult-red-dragon',
    badges: [{ label: 'Dragon' }, { label: 'CR 17' }],
  },
};

export const Spell: Story = {
  args: {
    name: 'Fireball',
    href: '/spells/fireball',
    badges: [{ label: 'Evocation' }, { label: '3rd Level' }],
  },
};

export const Item: Story = {
  args: {
    name: 'Bag of Holding',
    href: '/items/bag-of-holding',
    badges: [
      { label: 'Wondrous Items' },
      { label: 'Uncommon', color: 'green' },
    ],
  },
};
