import type { Meta, StoryObj } from '@storybook/react-vite';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form, FormTextArea, TextArea } from '@/components/ui/form';
import { Column } from '@/components/ui/layout';

const meta: Meta<typeof TextArea> = {
  title: 'Design System/Forms/TextArea',
  component: TextArea,
  parameters: {
    docs: {
      description: {
        component:
          'Multi-line field built on the same FieldWrapper as TextField: the ' +
          'stateful label, reserved message row, and focus/error styling all ' +
          'match, so a textarea sits beside text inputs without looking ' +
          'foreign. Use it for longer free text (descriptions, notes).',
      },
    },
  },
  args: {
    label: 'Description',
    placeholder: 'What is this collection for?',
  },
  decorators: [
    // A fixed-width column so the (inline-flex) fields grow to fill it via
    // align-items: stretch, rather than collapsing to their help-text width.
    // The preview's centered layout keeps the column centered.
    (Story) => (
      <Column gap="2" width="360px">
        <Story />
      </Column>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof TextArea>;

export const Default: Story = {};

export const WithHelpText: Story = {
  args: { helpText: 'Optional. Shown at the top of the book.' },
};

export const WithError: Story = {
  args: { error: 'Use at most 2000 characters.' },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: 'Stat blocks and items for the Barovia arc.',
    helpText: 'This field is read-only here.',
  },
};

export const States: Story = {
  render: (args) => (
    <>
      <TextArea
        {...args}
        error={undefined}
        helpText={undefined}
        label="Default"
      />
      <TextArea
        {...args}
        error={undefined}
        helpText="Help text reserves the message row."
        label="With help text"
      />
      <TextArea
        {...args}
        error="This is what an error looks like."
        label="With error"
      />
    </>
  ),
};

const bookSchema = z.object({
  description: z.string().max(2_000, 'Use at most 2000 characters.'),
});

// Live form: edits flow through react-hook-form via FormTextArea.
export const InForm: Story = {
  render: () => (
    <Form onSubmit={() => undefined} schema={bookSchema}>
      {() => (
        <Column gap="2">
          <FormTextArea
            helpText="Optional. Describe what belongs in this book."
            label="Description"
            name="description"
            placeholder="What is this collection for?"
            resize="vertical"
          />
          <Button type="submit">Save</Button>
        </Column>
      )}
    </Form>
  ),
};
