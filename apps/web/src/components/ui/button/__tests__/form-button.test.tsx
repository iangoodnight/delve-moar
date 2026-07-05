import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import { FormButton } from '../form-button';

function renderButton(ui: ReactElement) {
  return render(<Theme>{ui}</Theme>);
}

describe('FormButton', () => {
  it('renders a submit button with its children', () => {
    renderButton(<FormButton>Save</FormButton>);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toBeEnabled();
  });

  it('places the icon before the label by default', () => {
    renderButton(
      <FormButton icon={<svg data-testid="icon" />}>
        <span data-testid="label">Save</span>
      </FormButton>,
    );

    const icon = screen.getByTestId('icon');
    const label = screen.getByTestId('label');
    expect(
      icon.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('moves the icon after the label when iconRight is set', () => {
    renderButton(
      <FormButton icon={<svg data-testid="icon" />} iconRight>
        <span data-testid="label">Save</span>
      </FormButton>,
    );

    const icon = screen.getByTestId('icon');
    const label = screen.getByTestId('label');
    expect(
      icon.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
  });

  it('disables and shows a spinner while loading without an icon', () => {
    const { container } = renderButton(<FormButton loading>Save</FormButton>);

    expect(screen.getByRole('button')).toBeDisabled();
    expect(container.querySelector('.rt-Spinner')).toBeInTheDocument();
  });

  it('overlays the spinner on the icon while loading', () => {
    renderButton(
      <FormButton icon={<svg data-testid="icon" />} loading>
        Save
      </FormButton>,
    );

    expect(screen.getByRole('button')).toBeDisabled();
    // The icon is preserved and Radix overlays its spinner in the same
    // wrapper, so loading lands on the icon slot rather than the label.
    const icon = screen.getByTestId('icon');
    const spinnerWrapper = icon.parentElement?.parentElement;
    expect(spinnerWrapper?.querySelector('.rt-Spinner')).toBeInTheDocument();
  });

  it('passes through the disabled prop', () => {
    renderButton(<FormButton disabled>Save</FormButton>);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
