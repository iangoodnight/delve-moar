import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FormTextField } from '@/components/ui/form';
import { renderWithProvider } from '@/testing/setup';

import { FormDialog } from '../form-dialog';

const schema = z.object({ name: z.string().min(1, 'Enter a name.') });

interface RenderOptions {
  readonly onSubmit?: (
    values: { name: string },
    methods: unknown,
    close: () => void,
  ) => void;
  readonly submitting?: boolean;
  readonly triggerTooltip?: string;
}

function renderDialog({
  onSubmit = vi.fn(),
  submitting = false,
  triggerTooltip,
}: RenderOptions = {}) {
  return renderWithProvider(
    <FormDialog
      description="A short description."
      onSubmit={onSubmit}
      schema={schema}
      submitLabel="Save"
      submitting={submitting}
      title="Test dialog"
      trigger={<Button>Open</Button>}
      triggerTooltip={triggerTooltip}
    >
      {() => <FormTextField helpText="Your name." label="Name" name="name" />}
    </FormDialog>,
  );
}

async function open(
  user: ReturnType<typeof userEvent.setup>,
): Promise<HTMLElement> {
  await user.click(screen.getByRole('button', { name: 'Open' }));
  return screen.findByRole('dialog');
}

describe('FormDialog', () => {
  it('renders the title and description when opened', async () => {
    const user = userEvent.setup();
    renderDialog();

    const dialog = within(await open(user));
    expect(dialog.getByText('Test dialog')).toBeInTheDocument();
    expect(dialog.getByText('A short description.')).toBeInTheDocument();
  });

  it('passes the parsed values and a close callback to onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderDialog({ onSubmit });

    const dialog = within(await open(user));
    await user.type(dialog.getByLabelText('Name'), 'Ada');
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const [values, , close] = onSubmit.mock.calls[0] as [
      { name: string },
      unknown,
      () => void,
    ];
    expect(values).toEqual({ name: 'Ada' });
    expect(typeof close).toBe('function');
  });

  it('closes when onSubmit invokes close()', async () => {
    const user = userEvent.setup();
    renderDialog({
      onSubmit: (_values, _methods, close) => {
        close();
      },
    });

    const dialog = within(await open(user));
    await user.type(dialog.getByLabelText('Name'), 'Ada');
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('blocks submit and shows the validation error on invalid input', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderDialog({ onSubmit });

    const dialog = within(await open(user));
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('dismisses via Cancel', async () => {
    const user = userEvent.setup();
    renderDialog();

    const dialog = within(await open(user));
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('disables the submit button while submitting', async () => {
    const user = userEvent.setup();
    renderDialog({ submitting: true });

    const dialog = within(await open(user));
    expect(dialog.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('opens from a tooltip-wrapped trigger', async () => {
    const user = userEvent.setup();
    renderDialog({ triggerTooltip: 'Add something' });

    expect(await open(user)).toBeInTheDocument();
  });

  it('has no accessibility violations when open', async () => {
    const user = userEvent.setup();
    const { baseElement } = renderDialog();
    await open(user);

    expect(await axe(baseElement)).toHaveNoViolations();
  });
});
