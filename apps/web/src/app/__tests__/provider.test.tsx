import { useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppProvider } from '../provider';

// Probe component: useQueryClient() throws if no QueryClientProvider is in
// the tree, so successfully rendering the span proves the context is wired.
function QueryClientProbe() {
  useQueryClient();
  return <span data-testid="qc">provided</span>;
}

describe('AppProvider', () => {
  it('renders its children', () => {
    render(
      <AppProvider>
        <span>child content</span>
      </AppProvider>,
    );
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('provides a QueryClient via React Query context', () => {
    render(
      <AppProvider>
        <QueryClientProbe />
      </AppProvider>,
    );
    expect(screen.getByTestId('qc')).toHaveTextContent('provided');
  });
});
