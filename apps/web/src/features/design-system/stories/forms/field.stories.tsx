import type { Meta, StoryObj } from '@storybook/react-vite';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form, FormTextField, TextField } from '@/components/ui/form';
import { Column } from '@/components/ui/layout';

const meta: Meta<typeof TextField> = {
  title: 'Design System/Forms/Field',
  component: TextField,
  parameters: {
    docs: {
      description: {
        component:
          'Form field built on FieldWrapper: a stateful label (arrow-right on ' +
          'focus, prohibit + red on error) over a control, with a reserved ' +
          'message row that swaps between help text and the validation error ' +
          'without shifting layout. Focus a field to see the label turn ' +
          'accent-11 and the arrow slide in.',
      },
    },
  },
  args: {
    label: 'Email',
    placeholder: 'you@example.com',
  },
  decorators: [
    (Story) => (
      <Column gap="4" style={{ maxWidth: 360 }}>
        <Story />
      </Column>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof TextField>;

export const Default: Story = {};

export const WithHelpText: Story = {
  args: { helpText: 'We will only use this to send account emails.' },
};

export const WithError: Story = {
  args: { error: 'Enter a valid email address.' },
};

// Error wins the message row even when help text is also provided.
export const ErrorWithHelpText: Story = {
  args: {
    helpText: 'We will only use this to send account emails.',
    error: 'Enter a valid email address.',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: 'mara@example.com',
    helpText: 'Email changes happen in account settings.',
  },
};

export const States: Story = {
  render: (args) => (
    <>
      <TextField
        {...args}
        error={undefined}
        helpText={undefined}
        label="Default"
      />
      <TextField
        {...args}
        error={undefined}
        helpText="Help text reserves the message row."
        label="With help text"
      />
      <TextField
        {...args}
        error="This is what an error looks like."
        label="With error"
      />
    </>
  ),
};

const accountSchema = z.object({
  username: z.string().min(3, 'At least 3 characters.'),
  email: z.email('Enter a valid email address.'),
});

// Live form: submit empty to see validation drive the field states.
export const InForm: Story = {
  render: () => (
    <Form onSubmit={() => undefined} schema={accountSchema}>
      {() => (
        <Column gap="3">
          <FormTextField
            helpText="Lowercase letters, numbers, hyphen, and underscore."
            label="Username"
            name="username"
          />
          <FormTextField
            label="Email"
            name="email"
            placeholder="you@example.com"
          />
          <Button type="submit">Create account</Button>
        </Column>
      )}
    </Form>
  ),
};
