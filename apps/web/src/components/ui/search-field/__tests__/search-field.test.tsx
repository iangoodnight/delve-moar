import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { renderWithProvider } from '@/testing/setup';

import { SearchField } from '../search-field';

function ControlledSearch({
  onChange,
}: {
  readonly onChange: (value: string) => void;
}) {
  const [value, setValue] = useState('');
  return (
    <SearchField
      aria-label="Search"
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
      value={value}
    />
  );
}

describe('SearchField', () => {
  it('renders a searchbox with the accessible name and placeholder', () => {
    renderWithProvider(
      <SearchField aria-label="Search spells" placeholder="Search spells..." />,
    );
    const input = screen.getByRole('searchbox', { name: 'Search spells' });
    expect(input).toHaveAttribute('placeholder', 'Search spells...');
  });

  it('is uncontrolled by default: typing updates the value', async () => {
    const user = userEvent.setup();
    renderWithProvider(<SearchField aria-label="Search" />);
    const input = screen.getByRole('searchbox');
    await user.type(input, 'goblin');
    expect(input).toHaveValue('goblin');
  });

  it('drives a controlled value and reports changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProvider(<ControlledSearch onChange={onChange} />);
    const input = screen.getByRole('searchbox');
    await user.type(input, 'orc');
    expect(input).toHaveValue('orc');
    expect(onChange).toHaveBeenLastCalledWith('orc');
  });

  it('shows the clear button only when there is a value and clears on click', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <SearchField aria-label="Search" defaultValue="dragon" />,
    );
    const input = screen.getByRole('searchbox');
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(input).toHaveValue('');
    expect(
      screen.queryByRole('button', { name: 'Clear search' }),
    ).not.toBeInTheDocument();
  });

  it('omits the clear button when empty', () => {
    renderWithProvider(<SearchField aria-label="Search" />);
    expect(
      screen.queryByRole('button', { name: 'Clear search' }),
    ).not.toBeInTheDocument();
  });

  it('onClear overrides the default clear and leaves the value untouched', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    renderWithProvider(
      <SearchField
        aria-label="Search"
        defaultValue="dragon"
        onClear={onClear}
      />,
    );
    const input = screen.getByRole('searchbox');
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('dragon');
  });

  it('fires onSubmit with the current value on Enter', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProvider(<SearchField aria-label="Search" onSubmit={onSubmit} />);
    await user.type(screen.getByRole('searchbox'), 'lich{Enter}');
    expect(onSubmit).toHaveBeenLastCalledWith('lich');
  });

  it('clears on Escape', async () => {
    const user = userEvent.setup();
    renderWithProvider(<SearchField aria-label="Search" />);
    const input = screen.getByRole('searchbox');
    await user.type(input, 'kobold{Escape}');
    expect(input).toHaveValue('');
  });

  describe('focusOnSlash', () => {
    it('focuses the field when "/" is pressed outside an input', async () => {
      const user = userEvent.setup();
      renderWithProvider(<SearchField aria-label="Search" focusOnSlash />);
      const input = screen.getByRole('searchbox');
      expect(input).not.toHaveFocus();
      await user.keyboard('/');
      expect(input).toHaveFocus();
    });

    it('ignores "/" while another input is focused', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <>
          <input aria-label="Other" />
          <SearchField aria-label="Search" focusOnSlash />
        </>,
      );
      const other = screen.getByRole('textbox', { name: 'Other' });
      const input = screen.getByRole('searchbox');
      await user.click(other);
      await user.keyboard('/');
      expect(input).not.toHaveFocus();
      expect(other).toHaveValue('/');
    });

    it('does not attach the shortcut when focusOnSlash is off', async () => {
      const user = userEvent.setup();
      renderWithProvider(<SearchField aria-label="Search" />);
      await user.keyboard('/');
      expect(screen.getByRole('searchbox')).not.toHaveFocus();
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProvider(
      <SearchField aria-label="Search spells" defaultValue="dragon" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
