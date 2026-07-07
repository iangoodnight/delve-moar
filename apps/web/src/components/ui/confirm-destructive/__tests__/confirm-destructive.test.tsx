import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { renderWithProvider } from '@/testing/setup';

import { ConfirmDestructive } from '../confirm-destructive';

type Props = ComponentProps<typeof ConfirmDestructive>;

function Harness(overrides: Partial<Props>) {
  const [open, setOpen] = useState(false);
  return (
    <ConfirmDestructive
      confirmText="Delete"
      description="This cannot be undone."
      onOpenChange={setOpen}
      open={open}
      title="Delete thing?"
      trigger={<button type="button">Open</button>}
      {...overrides}
    />
  );
}

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Open' }));
  return within(await screen.findByRole('alertdialog'));
}

describe('ConfirmDestructive', () => {
  it('opens from the trigger with the title, description, and actions', async () => {
    const user = userEvent.setup();
    renderWithProvider(<Harness />);

    const dialog = await open(user);

    expect(dialog.getByText('Delete thing?')).toBeInTheDocument();
    expect(dialog.getByText('This cannot be undone.')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('opens from a tooltip-wrapped trigger', async () => {
    const user = userEvent.setup();
    renderWithProvider(<Harness triggerTooltip="Delete thing" />);

    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderWithProvider(<Harness onConfirm={onConfirm} />);

    const dialog = await open(user);
    await user.click(dialog.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('closes without confirming when cancelled', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderWithProvider(<Harness onConfirm={onConfirm} />);

    const dialog = await open(user);
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('submits the associated form in formId mode', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProvider(
      <Harness formId="confirm-form">
        <form
          id="confirm-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <input aria-label="reason" name="reason" />
        </form>
      </Harness>,
    );

    const dialog = await open(user);
    await user.click(dialog.getByRole('button', { name: 'Delete' }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('has no accessibility violations when open', async () => {
    const user = userEvent.setup();
    renderWithProvider(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = await screen.findByRole('alertdialog');

    expect(await axe(dialog)).toHaveNoViolations();
  });
});
