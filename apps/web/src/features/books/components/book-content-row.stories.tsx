import type { Meta, StoryObj } from '@storybook/react-vite';

import { Column } from '@/components/ui/layout';

import { BookContentRow } from './book-content-row';

const meta: Meta<typeof BookContentRow> = {
  title: 'Features/Books/BookContentRow',
  component: BookContentRow,
  parameters: {
    docs: {
      description: {
        component:
          'A single in-book content item: the name links to the content ' +
          'detail, with a type-specific metadatum on the right. Used in the ' +
          'book-detail tabs for monsters, spells, and items.',
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
    meta: 'CR 17',
  },
};

export const Spell: Story = {
  args: { name: 'Fireball', href: '/spells/fireball', meta: 'Level 3' },
};

export const Item: Story = {
  args: {
    name: 'Bag of Holding',
    href: '/items/bag-of-holding',
    meta: 'Uncommon',
  },
};
