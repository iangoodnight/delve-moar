import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { renderWithProvider } from '@/testing/setup';

import { FieldWrapper } from '../field-wrapper';

interface RenderOptions {
  readonly error?: string;
  readonly helpText?: string;
}

function renderField({ error, helpText }: RenderOptions = {}) {
  return renderWithProvider(
    <FieldWrapper label="Email" error={error} helpText={helpText}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid ? true : undefined}
        />
      )}
    </FieldWrapper>,
  );
}

describe('FieldWrapper', () => {
  it('associates the label with the control', () => {
    renderField();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders help text and points aria-describedby at it', () => {
    renderField({ helpText: 'We never share your email.' });

    const input = screen.getByLabelText('Email');
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    expect(describedBy).not.toBe('');
    expect(document.getElementById(describedBy)).toHaveTextContent(
      'We never share your email.',
    );
  });

  it('shows the error instead of help text and marks the field invalid', () => {
    renderField({ helpText: 'We never share your email.', error: 'Required' });

    expect(screen.getByRole('alert')).toHaveTextContent('Required');
    expect(
      screen.queryByText('We never share your email.'),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('omits aria-describedby when there is no message', () => {
    renderField();
    expect(screen.getByLabelText('Email')).not.toHaveAttribute(
      'aria-describedby',
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = renderField({ helpText: 'Help' });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
