import { Theme } from '@radix-ui/themes';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { MonsterFilters } from '../monster-filters';

// Render the URL search params into the DOM so tests can assert via DOM queries
// rather than capturing closures (which the React Compiler rightly rejects).
// The probe re-renders whenever the URL changes, so the testid node always
// reflects current URL state.
function SearchParamsProbe() {
  const [params] = useSearchParams();
  return <div data-testid="search-params">{params.toString()}</div>;
}

function renderFilters(initialEntry = '/monsters') {
  return render(
    <Theme>
      <MemoryRouter initialEntries={[initialEntry]}>
        <MonsterFilters />
        <SearchParamsProbe />
      </MemoryRouter>
    </Theme>,
  );
}

function searchParamsNode() {
  return screen.getByTestId('search-params');
}

describe('MonsterFilters', () => {
  it('renders search, type, CR min, and CR max controls', () => {
    renderFilters();
    expect(screen.getByPlaceholderText(/search monsters/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CR min/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CR max/i)).toBeInTheDocument();
  });

  it('debounces search input updates to the URL', async () => {
    const user = userEvent.setup();
    renderFilters();

    await user.type(screen.getByPlaceholderText(/search monsters/i), 'dragon');

    await waitFor(() => {
      expect(searchParamsNode()).toHaveTextContent('search=dragon');
    });
  });

  it('writes cr_min to the URL when typed', async () => {
    const user = userEvent.setup();
    renderFilters();

    await user.type(screen.getByLabelText(/CR min/i), '5');

    await waitFor(() => {
      expect(searchParamsNode()).toHaveTextContent('cr_min=5');
    });
  });

  it('writes cr_max to the URL when typed', async () => {
    const user = userEvent.setup();
    renderFilters();

    await user.type(screen.getByLabelText(/CR max/i), '20');

    await waitFor(() => {
      expect(searchParamsNode()).toHaveTextContent('cr_max=20');
    });
  });

  it('initializes the search input from the URL on mount', () => {
    renderFilters('/monsters?search=fiend');
    expect(screen.getByPlaceholderText(/search monsters/i)).toHaveValue(
      'fiend',
    );
  });

  it('clears the input and search param on Escape', async () => {
    const user = userEvent.setup();
    renderFilters('/monsters?search=fiend');

    const input = screen.getByPlaceholderText(/search monsters/i);
    expect(input).toHaveValue('fiend');

    await user.click(input);
    await user.keyboard('{Escape}');

    expect(input).toHaveValue('');
    await waitFor(() => {
      expect(searchParamsNode()).not.toHaveTextContent('search=');
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderFilters();
    expect(await axe(container)).toHaveNoViolations();
  });
});
