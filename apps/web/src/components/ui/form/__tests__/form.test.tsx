import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { z } from 'zod';

import { renderWithProvider } from '@/testing/setup';

import { Form } from '../form';
import { FormTextField } from '../form-text-field';

const schema = z.object({
  username: z.string().min(3, 'At least 3 characters'),
});

interface TestFormProps {
  readonly onSubmit: (values: { username: string }) => void;
}

function TestForm({ onSubmit }: TestFormProps) {
  return (
    <Form schema={schema} onSubmit={onSubmit}>
      {() => (
        <>
          <FormTextField name="username" label="Username" />
          <button type="submit">Submit</button>
        </>
      )}
    </Form>
  );
}

describe('Form + FormTextField', () => {
  it('associates the label with the input', () => {
    renderWithProvider(<TestForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('shows a validation error and marks the field invalid on bad input', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProvider(<TestForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('At least 3 characters');
    expect(screen.getByLabelText('Username')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with the parsed values when valid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProvider(<TestForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Username'), 'mara');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ username: 'mara' });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProvider(<TestForm onSubmit={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
