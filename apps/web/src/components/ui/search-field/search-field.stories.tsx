import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Box } from '@/components/ui/layout';

import { SearchField } from './search-field';

const meta = {
  component: SearchField,
  parameters: { layout: 'fullscreen' },
  title: 'Design System/SearchField',
  decorators: [
    (Story) => (
      <Box maxWidth="24rem" width="100%">
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof SearchField>;

export default meta;

type Story = StoryObj<typeof meta>;

// uncontrolled: type to see the clear button appear on hover/focus
export const Default: Story = {
  args: { 'aria-label': 'Search spells', placeholder: 'Search spells...' },
};

// controlled, pre-filled so the clear affordance shows on hover/focus
export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState('fireball');
    return (
      <SearchField
        aria-label="Search spells"
        onChange={setValue}
        placeholder="Search spells..."
        value={value}
      />
    );
  },
};

// press "/" (while not focused in another input) to jump into the field
export const SlashToFocus: Story = {
  args: {
    'aria-label': 'Search',
    focusOnSlash: true,
    placeholder: 'Press / to focus',
  },
};
