import { Theme } from '@radix-ui/themes';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { SpellFilters } from '../spell-filters';

function SearchParamsProbe() {
  const [params] = useSearchParams();
  return <div data-testid="search-params">{params.toString()}</div>;
}

function renderFilters(initialEntry = '/spells') {
  return render(
    <Theme>
      <MemoryRouter initialEntries={[initialEntry]}>
        <SpellFilters />
        <SearchParamsProbe />
      </MemoryRouter>
    </Theme>,
  );
}

function searchParamsNode() {
  return screen.getByTestId('search-params');
}

describe('SpellFilters', () => {
  it('renders search, school, level min, and level max controls', () => {
    renderFilters();
    expect(screen.getByPlaceholderText(/search spells/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/school/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/level min/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/level max/i)).toBeInTheDocument();
  });

  it('debounces search input updates to the URL', async () => {
    const user = userEvent.setup();
    renderFilters();

    await user.type(screen.getByPlaceholderText(/search spells/i), 'fire');

    await waitFor(() => {
      expect(searchParamsNode()).toHaveTextContent('search=fire');
    });
  });

  it('initializes the search input from the URL on mount', () => {
    renderFilters('/spells?search=heal');
    expect(screen.getByPlaceholderText(/search spells/i)).toHaveValue('heal');
  });

  it('clears the input and search param on Escape', async () => {
    const user = userEvent.setup();
    renderFilters('/spells?search=heal');

    const input = screen.getByPlaceholderText(/search spells/i);
    expect(input).toHaveValue('heal');

    await user.click(input);
    await user.keyboard('{Escape}');

    expect(input).toHaveValue('');
    await waitFor(() => {
      expect(searchParamsNode()).not.toHaveTextContent('search=');
    });
  });

  it('reflects an existing level_min URL param on the level-min trigger', () => {
    renderFilters('/spells?level_min=3');
    expect(screen.getByLabelText(/level min/i)).toHaveTextContent('3rd');
  });

  it('reflects an existing school URL param on the school trigger', () => {
    renderFilters('/spells?school=evocation');
    expect(screen.getByLabelText(/school/i)).toHaveTextContent('evocation');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderFilters();
    expect(await axe(container)).toHaveNoViolations();
  });
});
