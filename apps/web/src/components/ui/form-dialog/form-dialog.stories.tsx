import { PencilIcon } from '@phosphor-icons/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FormTextField } from '@/components/ui/form';

import { FormDialog } from './form-dialog';

const schema = z.object({ name: z.string().min(1, 'Enter a name.') });

// a concrete usage of the generic FormDialog so the story's types stay simple
function RenameDialog() {
  return (
    <FormDialog
      description="Give it a name. This is only a demonstration."
      onSubmit={(_values, _methods, close) => {
        close();
      }}
      schema={schema}
      submitIcon={<PencilIcon aria-hidden="true" weight="bold" />}
      submitLabel="Save"
      title="Rename"
      trigger={<Button>Rename</Button>}
    >
      {() => (
        <FormTextField helpText="Anything you like." label="Name" name="name" />
      )}
    </FormDialog>
  );
}

const meta = {
  component: RenameDialog,
  parameters: { layout: 'fullscreen' },
  title: 'Design System/Dialogs/FormDialog',
} satisfies Meta<typeof RenameDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Rename' }));
    // the dialog portals to document.body, outside the story canvas
    const dialog = within(await within(document.body).findByRole('dialog'));
    await expect(dialog.getByLabelText('Name')).toBeInTheDocument();
  },
};
