import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { renderWithProvider } from '@/testing/setup';

import { TextArea } from '../text-area';

describe('TextArea', () => {
  it('renders a labelled multi-line control', () => {
    renderWithProvider(<TextArea label="Description" />);

    const field = screen.getByLabelText('Description');
    expect(field).toBeInTheDocument();
    expect(field.tagName).toBe('TEXTAREA');
  });

  it('accepts typed input', async () => {
    const user = userEvent.setup();
    renderWithProvider(<TextArea label="Description" />);

    await user.type(screen.getByLabelText('Description'), 'A spooky shelf');
    expect(screen.getByLabelText('Description')).toHaveValue('A spooky shelf');
  });

  it('announces the validation error and marks the field invalid', () => {
    renderWithProvider(
      <TextArea error="Use at most 2000 characters." label="Description" />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Use at most 2000 characters.',
    );
    expect(screen.getByLabelText('Description')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('shows help text when there is no error', () => {
    renderWithProvider(<TextArea helpText="Optional." label="Description" />);

    expect(screen.getByText('Optional.')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProvider(<TextArea label="Description" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
